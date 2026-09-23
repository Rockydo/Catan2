import { afterAll, beforeAll, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rename,
  rm,
  symlink,
  utimes,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";

let server: ChildProcess, directory: string, base: string;
const board = Buffer.alloc(2_000_000, 57);
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "catane-http-"));
  await mkdir(join(directory, "assets", "seasons"), { recursive: true });
  await writeFile(join(directory, "index.html"), "<p>Campaign</p>");
  await writeFile(join(directory, "assets", "board.webp"), board);
  await writeFile(
    join(directory, "assets", "seasons", "cold-forest-winter.webp"),
    "art",
  );
  await writeFile(
    join(directory, "assets", "App-aB_cD-12.js"),
    "export const version=1;",
  );
  await writeFile(
    join(directory, "assets", "seasonal-art-manifest.json"),
    "{}",
  );
  await symlink(
    fileURLToPath(new URL("../package.json", import.meta.url)),
    join(directory, "outside"),
  );
  server = spawn(
    process.execPath,
    [fileURLToPath(new URL("../scripts/serve.mjs", import.meta.url))],
    {
      env: {
        ...process.env,
        DIST_DIR: directory,
        PORT: "0",
        HOST: "127.0.0.1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  base = await new Promise<string>((resolve, reject) => {
    let output = "";
    const timer = setTimeout(
      () => reject(Error("Static server did not start.")),
      5000,
    );
    server.stdout!.on("data", (chunk) => {
      output += chunk;
      const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (url) {
        clearTimeout(timer);
        resolve(url);
      }
    });
    server.on("error", reject);
    server.on("exit", (code) => {
      clearTimeout(timer);
      reject(Error(`Static server exited: ${code}`));
    });
  });
});
afterAll(async () => {
  if (server?.exitCode === null) {
    const stopped = once(server, "exit");
    server.kill("SIGTERM");
    await stopped;
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

it("streams exact image bytes with validators and the correct media type", async () => {
  const response = await fetch(`${base}/assets/board.webp`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/webp");
  expect(response.headers.get("content-length")).toBe(String(board.length));
  expect(response.headers.get("etag")).toMatch(/^W\/".+"$/);
  expect(
    Number.isFinite(Date.parse(response.headers.get("last-modified")!)),
  ).toBe(true);
  expect(response.headers.get("cache-control")).toBe("no-cache");
  expect(Buffer.from(await response.arrayBuffer()).equals(board)).toBe(true);
});

it("returns body-free 304 responses for current weak, strong, list and wildcard validators", async () => {
  const initial = await fetch(base, { method: "HEAD" });
  const etag = initial.headers.get("etag")!;
  for (const value of [etag, etag.slice(2), `"obsolete", ${etag}`, "*"]) {
    for (const method of ["GET", "HEAD"]) {
      const response = await fetch(base, {
        method,
        headers: { "If-None-Match": value },
      });
      expect(response.status).toBe(304);
      expect(await response.text()).toBe("");
      expect(response.headers.get("content-length")).toBeNull();
      expect(response.headers.get("etag")).toBe(etag);
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    }
  }
});

it("supports date validation while giving ETags precedence", async () => {
  const initial = await fetch(base, { method: "HEAD" });
  const date = initial.headers.get("last-modified")!;
  const cached = await fetch(base, { headers: { "If-Modified-Since": date } });
  expect(cached.status).toBe(304);
  const requests: Record<string, string>[] = [
    { "If-Modified-Since": date, "If-None-Match": '"obsolete"' },
    { "If-Modified-Since": "invalid" },
    { "If-Modified-Since": "Thu, 01 Jan 1970 00:00:00 GMT" },
  ];
  for (const headers of requests) {
    const response = await fetch(base, { headers });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<p>Campaign</p>");
  }
});

it("detects same-size atomic replacements even when the modification date is preserved", async () => {
  const path = join(directory, "refresh.html");
  const date = new Date("2026-01-01T12:00:00Z");
  await writeFile(path, "old");
  await utimes(path, date, date);
  const first = await fetch(`${base}/refresh.html`);
  const etag = first.headers.get("etag")!;
  expect(await first.text()).toBe("old");
  await writeFile(`${path}.next`, "new");
  await utimes(`${path}.next`, date, date);
  await rename(`${path}.next`, path);
  const updated = await fetch(`${base}/refresh.html`, {
    headers: { "If-None-Match": etag },
  });
  expect(updated.status).toBe(200);
  expect(updated.headers.get("etag")).not.toBe(etag);
  expect(await updated.text()).toBe("new");
});

it("only treats versioned build assets as immutable", async () => {
  for (const path of [
    "/assets/board.webp",
    "/assets/seasons/cold-forest-winter.webp",
    "/assets/seasonal-art-manifest.json",
    "/",
  ]) {
    const response = await fetch(base + path, { method: "HEAD" });
    expect(response.headers.get("cache-control")).toBe("no-cache");
    expect(await response.text()).toBe("");
  }
  const build = await fetch(`${base}/assets/App-aB_cD-12.js`, {
    method: "HEAD",
  });
  expect(build.headers.get("cache-control")).toBe(
    "public, max-age=31536000, immutable",
  );
});

it("retains path and method restrictions even for conditional requests", async () => {
  for (const path of [
    "/missing",
    "/outside",
    "/%00",
    "/%5cetc%5cpasswd",
    "/..%2fpackage.json",
    "/assets",
  ]) {
    const response = await fetch(base + path, {
      headers: { "If-None-Match": "*" },
    });
    expect(response.status).toBe(404);
    await response.arrayBuffer();
  }
  const response = await fetch(base, {
    method: "POST",
    headers: { "If-None-Match": "*" },
  });
  expect(response.status).toBe(405);
  expect(response.headers.get("allow")).toBe("GET, HEAD");
  await response.arrayBuffer();
});

it("survives a cancelled large download and serves subsequent requests", async () => {
  const response = await fetch(`${base}/assets/board.webp`);
  await response.body!.cancel();
  const next = await fetch(base);
  expect(next.status).toBe(200);
  expect(await next.text()).toBe("<p>Campaign</p>");
});
