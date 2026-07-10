#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";
import { list } from "@vercel/blob";

const execFileAsync = promisify(execFile);
const bucket = process.env.SPACES_BUCKET ?? "brainrot-publishing";
const spacesBaseUrl =
  process.env.SPACES_BASE_URL ??
  `https://${bucket}.nyc3.digitaloceanspaces.com`;
const outputPath =
  process.env.MIGRATION_MANIFEST ??
  "docs/evidence/brainrot-spaces-migration-manifest.json";
const concurrency = Number(process.env.MIGRATION_CONCURRENCY ?? 6);
const verifyOnly = process.argv.includes("--verify-only");

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("BLOB_READ_WRITE_TOKEN is required");
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function listAllBlobs() {
  const blobs = [];
  let cursor;
  do {
    const page = await list({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      limit: 1000,
      cursor,
    });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs.sort((a, b) => a.pathname.localeCompare(b.pathname));
}

async function fetchBytes(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText} fetching ${url}`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

async function copyAndVerify(blob, workDir) {
  const sourceBytes = await fetchBytes(blob.url);
  if (sourceBytes.byteLength !== blob.size) {
    throw new Error(
      `source size mismatch for ${blob.pathname}: listed=${blob.size} fetched=${sourceBytes.byteLength}`,
    );
  }

  const sourceSha256 = sha256(sourceBytes);
  const destinationUrl = new URL(blob.pathname, `${spacesBaseUrl}/`).toString();

  if (!verifyOnly) {
    const localPath = join(
      workDir,
      `${sourceSha256}-${basename(blob.pathname)}`,
    );
    await writeFile(localPath, sourceBytes);
    await execFileAsync("s3cmd", [
      "put",
      "--acl-public",
      "--guess-mime-type",
      "--add-header=Cache-Control: public, max-age=3600",
      localPath,
      `s3://${bucket}/${blob.pathname}`,
    ]);
    await rm(localPath, { force: true });
  }

  const destinationBytes = await fetchBytes(destinationUrl);
  const destinationSha256 = sha256(destinationBytes);
  if (
    sourceBytes.byteLength !== destinationBytes.byteLength ||
    sourceSha256 !== destinationSha256
  ) {
    throw new Error(`destination content mismatch for ${blob.pathname}`);
  }

  return {
    pathname: blob.pathname,
    bytes: blob.size,
    uploadedAt: blob.uploadedAt,
    sourceUrl: blob.url,
    destinationUrl,
    sourceSha256,
    destinationSha256,
  };
}

async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

const blobs = await listAllBlobs();
const workDir = await mkdtemp(join(tmpdir(), "brainrot-spaces-"));
const startedAt = new Date().toISOString();

try {
  let completed = 0;
  const objects = await mapConcurrent(blobs, concurrency, async (blob) => {
    const result = await copyAndVerify(blob, workDir);
    completed += 1;
    if (completed % 25 === 0 || completed === blobs.length) {
      console.error(`verified ${completed}/${blobs.length}`);
    }
    return result;
  });

  const totalBytes = objects.reduce((sum, object) => sum + object.bytes, 0);
  const manifest = {
    schema: "brainrot-spaces-migration-manifest.v1",
    source: "Vercel Blob store store_82QOs1wlXBD4IQ1g",
    destination: `s3://${bucket}`,
    spacesBaseUrl,
    mode: verifyOnly ? "verify-only" : "copy-and-verify",
    startedAt,
    completedAt: new Date().toISOString(),
    objectCount: objects.length,
    totalBytes,
    allHashesMatch: objects.every(
      (object) => object.sourceSha256 === object.destinationSha256,
    ),
    objects,
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    JSON.stringify({
      outputPath,
      objectCount: manifest.objectCount,
      totalBytes: manifest.totalBytes,
      allHashesMatch: manifest.allHashesMatch,
    }),
  );
} finally {
  await rm(workDir, { recursive: true, force: true });
}
