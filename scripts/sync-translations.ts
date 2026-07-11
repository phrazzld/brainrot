#!/usr/bin/env node

import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type ListObjectsV2CommandOutput,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import chalk from "chalk";
import { Command } from "commander";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import pLimit from "p-limit";

export type SpacesConfig = Pick<
  S3ClientConfig,
  "credentials" | "endpoint" | "region"
> & {
  bucket: string;
};

type SyncOptions = {
  concurrency?: string;
  delete?: boolean;
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
};

type GeneratedFile = {
  checksum: string;
  key: string;
  localPath: string;
  size: number;
};

type ExistingObject = {
  checksum?: string;
  key: string;
  size: number;
};

type SyncReport = {
  deleted: string[];
  dryRun: boolean;
  errors: string[];
  skipped: string[];
  slug: string;
  uploaded: string[];
};

const requiredConfig = [
  "SPACES_ACCESS_KEY_ID",
  "SPACES_SECRET_ACCESS_KEY",
  "SPACES_ENDPOINT",
  "SPACES_BUCKET_NAME",
] as const;

function requiredValue(
  env: NodeJS.ProcessEnv,
  name: (typeof requiredConfig)[number],
): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function resolveSpacesConfig(env: NodeJS.ProcessEnv): SpacesConfig {
  const endpoint = requiredValue(env, "SPACES_ENDPOINT");

  return {
    bucket: requiredValue(env, "SPACES_BUCKET_NAME"),
    credentials: {
      accessKeyId: requiredValue(env, "SPACES_ACCESS_KEY_ID"),
      secretAccessKey: requiredValue(env, "SPACES_SECRET_ACCESS_KEY"),
    },
    endpoint: /^https?:\/\//i.test(endpoint) ? endpoint : `https://${endpoint}`,
    region: env.SPACES_REGION?.trim() || "us-east-1",
  };
}

export function objectKey(slug: string, filename: string): string {
  return `books/${slug}/text/${filename}`;
}

function spacesClient(config: SpacesConfig): S3Client {
  return new S3Client({
    credentials: config.credentials,
    endpoint: config.endpoint,
    region: config.region,
  });
}

function checksum(bytes: Buffer): string {
  return createHash("md5").update(bytes).digest("hex");
}

function normalizeEtag(etag: string | undefined): string | undefined {
  return etag?.replace(/^"|"$/g, "");
}

async function generatedFiles(
  root: string,
  slug: string,
): Promise<GeneratedFile[]> {
  const textRoot = path.join(root, slug, "text");
  const entries = await fs
    .readdir(textRoot, { withFileTypes: true })
    .catch(() => null);
  if (!entries) {
    throw new Error(
      `No generated text files found for ${slug}; run generate:formats first`,
    );
  }

  const textEntries = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (textEntries.length === 0) {
    throw new Error(
      `No generated text files found for ${slug}; refusing an empty publish`,
    );
  }

  return Promise.all(
    textEntries.map(async (entry) => {
      const localPath = path.join(textRoot, entry.name);
      const bytes = await fs.readFile(localPath);
      return {
        checksum: checksum(bytes),
        key: objectKey(slug, entry.name),
        localPath,
        size: bytes.byteLength,
      };
    }),
  );
}

async function existingObjects(
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<Map<string, ExistingObject>> {
  const objects = new Map<string, ExistingObject>();
  let continuationToken: string | undefined;

  do {
    const page = (await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        Prefix: prefix,
      }),
    )) as ListObjectsV2CommandOutput;

    for (const object of page.Contents || []) {
      if (!object.Key) continue;
      objects.set(object.Key, {
        checksum: normalizeEtag(object.ETag),
        key: object.Key,
        size: object.Size || 0,
      });
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}

function needsUpload(
  file: GeneratedFile,
  existing: ExistingObject | undefined,
  force: boolean,
): boolean {
  return (
    force ||
    !existing ||
    existing.size !== file.size ||
    existing.checksum !== file.checksum
  );
}

async function writeReport(
  report: SyncReport,
  workingDirectory: string,
): Promise<void> {
  const reportPath = path.join(workingDirectory, "sync-log.json");
  const prior = await fs
    .readFile(reportPath, "utf8")
    .then((value) => JSON.parse(value) as Record<string, unknown>)
    .catch(() => ({}));

  prior[report.slug] = {
    ...report,
    completedAt: new Date().toISOString(),
  };
  await fs.writeFile(reportPath, `${JSON.stringify(prior, null, 2)}\n`);
}

export async function syncBook(
  client: S3Client,
  config: SpacesConfig,
  slug: string,
  options: SyncOptions,
  workingDirectory = process.cwd(),
): Promise<SyncReport> {
  const files = await generatedFiles(
    path.join(workingDirectory, "generated"),
    slug,
  );
  const prefix = objectKey(slug, "");
  const existing = await existingObjects(client, config.bucket, prefix);
  const force = Boolean(options.force);
  const concurrency = Number.parseInt(options.concurrency || "5", 10);
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error("--concurrency must be a positive integer");
  }

  const report: SyncReport = {
    deleted: [],
    dryRun: Boolean(options.dryRun),
    errors: [],
    skipped: [],
    slug,
    uploaded: [],
  };
  const limit = pLimit(concurrency);

  await Promise.all(
    files.map((file) =>
      limit(async () => {
        if (!needsUpload(file, existing.get(file.key), force)) {
          report.skipped.push(file.key);
          return;
        }

        if (!options.dryRun) {
          const body = await fs.readFile(file.localPath);
          try {
            await client.send(
              new PutObjectCommand({
                ACL: "public-read",
                Body: body,
                Bucket: config.bucket,
                CacheControl: "public, max-age=3600",
                ContentType: "text/plain; charset=utf-8",
                Key: file.key,
              }),
            );
          } catch (error) {
            report.errors.push(
              `${file.key}: ${error instanceof Error ? error.message : String(error)}`,
            );
            return;
          }
        }
        report.uploaded.push(file.key);
      }),
    ),
  );

  if (options.delete) {
    const generatedKeys = new Set(files.map((file) => file.key));
    for (const key of [...existing.keys()].sort()) {
      if (generatedKeys.has(key)) continue;
      if (!options.dryRun) {
        try {
          await client.send(
            new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
          );
        } catch (error) {
          report.errors.push(
            `${key}: ${error instanceof Error ? error.message : String(error)}`,
          );
          continue;
        }
      }
      report.deleted.push(key);
    }
  }

  report.uploaded.sort();
  report.skipped.sort();
  await writeReport(report, workingDirectory);
  return report;
}

async function bookSlugs(): Promise<string[]> {
  const root = path.join(process.cwd(), "generated");
  const entries = await fs
    .readdir(root, { withFileTypes: true })
    .catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function printReport(report: SyncReport, verbose: boolean): void {
  const mode = report.dryRun ? "planned" : "completed";
  console.log(
    chalk.green(
      `${report.slug}: ${mode}; uploads=${report.uploaded.length} skipped=${report.skipped.length} deleted=${report.deleted.length}`,
    ),
  );
  if (verbose) console.log(JSON.stringify(report, null, 2));
  if (report.errors.length > 0) {
    throw new Error(
      `${report.slug}: ${report.errors.length} object operation(s) failed`,
    );
  }
}

async function main(): Promise<void> {
  const { config: dotenvConfig } = await import("dotenv");
  dotenvConfig({ path: ".env.local", quiet: true });

  const program = new Command()
    .name("sync-translations")
    .description("Publish generated text files to DigitalOcean Spaces")
    .version("2.0.0");

  const addOptions = (command: Command): Command =>
    command
      .option("-f, --force", "upload files even when size and checksum match")
      .option("-d, --delete", "delete remote text files missing locally")
      .option("--dry-run", "report changes without writing to Spaces")
      .option("--verbose", "print object-level results")
      .option("-c, --concurrency <number>", "concurrent uploads", "5");

  addOptions(
    program.command("book <slug>").description("publish one generated book"),
  ).action(async (slug: string, options: SyncOptions) => {
    const config = resolveSpacesConfig(process.env);
    const client = spacesClient(config);
    printReport(
      await syncBook(client, config, slug, options),
      Boolean(options.verbose),
    );
  });

  addOptions(
    program.command("all").description("publish every generated book"),
  ).action(async (options: SyncOptions) => {
    const config = resolveSpacesConfig(process.env);
    const client = spacesClient(config);
    const slugs = await bookSlugs();
    if (slugs.length === 0)
      throw new Error("No generated books found; run generate:formats first");
    for (const slug of slugs) {
      printReport(
        await syncBook(client, config, slug, options),
        Boolean(options.verbose),
      );
    }
  });

  await program.parseAsync(process.argv);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 1;
  });
}
