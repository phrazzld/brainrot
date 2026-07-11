import {
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  objectKey,
  resolveSpacesConfig,
  syncBook,
  type SpacesConfig,
} from "./sync-translations";

describe("Spaces translation publishing", () => {
  it("uses the declared DigitalOcean Spaces contract", () => {
    expect(
      resolveSpacesConfig({
        SPACES_ACCESS_KEY_ID: "access",
        SPACES_BUCKET_NAME: "brainrot-publishing",
        SPACES_ENDPOINT: "nyc3.digitaloceanspaces.com",
        SPACES_SECRET_ACCESS_KEY: "secret",
      }),
    ).toEqual({
      bucket: "brainrot-publishing",
      credentials: {
        accessKeyId: "access",
        secretAccessKey: "secret",
      },
      endpoint: "https://nyc3.digitaloceanspaces.com",
      region: "us-east-1",
    });
  });

  it("publishes generated text under the reader-compatible book path", () => {
    expect(objectKey("the-iliad", "book-01.txt")).toBe(
      "books/the-iliad/text/book-01.txt",
    );
  });

  it("rejects an incomplete Spaces credential contract", () => {
    expect(() =>
      resolveSpacesConfig({
        SPACES_BUCKET_NAME: "brainrot-publishing",
        SPACES_ENDPOINT: "nyc3.digitaloceanspaces.com",
      }),
    ).toThrow("SPACES_ACCESS_KEY_ID");
  });

  it("publishes generated text through the Spaces-compatible S3 boundary", async () => {
    const workingDirectory = await mkdtemp(
      join(tmpdir(), "brainrot-spaces-test-"),
    );
    const textRoot = join(workingDirectory, "generated", "the-iliad", "text");
    await mkdir(textRoot, { recursive: true });
    await writeFile(join(textRoot, "book-01.txt"), "sing, goddess");

    const commands: unknown[] = [];
    const client = {
      async send(command: unknown) {
        commands.push(command);
        return command instanceof ListObjectsV2Command ? { Contents: [] } : {};
      },
    } as unknown as S3Client;
    const config: SpacesConfig = {
      bucket: "brainrot-publishing",
      credentials: { accessKeyId: "access", secretAccessKey: "secret" },
      endpoint: "https://nyc3.digitaloceanspaces.com",
      region: "us-east-1",
    };

    try {
      const report = await syncBook(
        client,
        config,
        "the-iliad",
        {},
        workingDirectory,
      );
      const upload = commands.find(
        (command): command is PutObjectCommand =>
          command instanceof PutObjectCommand,
      );

      expect(report).toMatchObject({
        errors: [],
        uploaded: ["books/the-iliad/text/book-01.txt"],
      });
      expect(upload?.input).toMatchObject({
        ACL: "public-read",
        Bucket: "brainrot-publishing",
        ContentType: "text/plain; charset=utf-8",
        Key: "books/the-iliad/text/book-01.txt",
      });
    } finally {
      await rm(workingDirectory, { recursive: true, force: true });
    }
  });
});
