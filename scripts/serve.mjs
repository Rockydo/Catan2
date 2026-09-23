import http from "node:http";
import { open, stat, realpath } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const directory = resolve(
  process.env.DIST_DIR || fileURLToPath(new URL("../dist/", import.meta.url)),
);
const port = Number(process.env.PORT || 4173),
  host = process.env.HOST || "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};
await stat(resolve(directory, "index.html")).catch(() => {
  console.error("Build the game first: npm run build");
  process.exit(1);
});
const root = await realpath(directory);
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  );
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end("Method not allowed");
    return;
  }
  let handle;
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (pathname.includes("\0") || pathname.includes("\\"))
      throw new Error("Invalid path");
    const file = resolve(
      root,
      "." + pathname + (pathname.endsWith("/") ? "index.html" : ""),
    );
    if (file !== root && !file.startsWith(root + sep))
      throw new Error("Invalid path");
    const actual = await realpath(file);
    if (!actual.startsWith(root + sep)) throw new Error("Invalid path");
    // Stat and stream the same open file, including across an atomic deployment.
    // Conditional requests and HEAD need no file-body read or full-size buffer.
    handle = await open(actual, "r");
    const metadata = await handle.stat({ bigint: true });
    if (!metadata.isFile()) throw new Error("Not a file");
    const modified = Number(metadata.mtimeNs / 1_000_000n);
    const etag = `W/"${metadata.dev}-${metadata.ino}-${metadata.size}-${metadata.mtimeNs}-${metadata.ctimeNs}"`;
    res.setHeader(
      "Content-Type",
      types[extname(actual)] || "application/octet-stream",
    );
    res.setHeader(
      "Cache-Control",
      /^\/assets\/[^/]+-[a-zA-Z0-9_-]{8}\.(?:js|css|woff2?)$/.test(pathname)
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    );
    res.setHeader("ETag", etag);
    res.setHeader("Last-Modified", new Date(modified).toUTCString());
    const tags = req.headers["if-none-match"];
    const since = Date.parse(req.headers["if-modified-since"] ?? "");
    // If-None-Match takes precedence, even when it does not match. GET/HEAD use
    // weak comparison, so clients may send the same tag without the W/ prefix.
    const unchanged =
      tags !== undefined
        ? tags.split(",").some((tag) => {
            const value = tag.trim();
            return value === "*" || value.replace(/^W\//, "") === etag.slice(2);
          })
        : Number.isFinite(since) && Math.floor(modified / 1000) * 1000 <= since;
    if (unchanged) {
      res.writeHead(304);
      res.end();
      return;
    }
    res.setHeader("Content-Length", String(metadata.size));
    res.writeHead(200);
    if (req.method === "HEAD") res.end();
    else await pipeline(handle.createReadStream(), res);
  } catch {
    if (res.headersSent) res.destroy();
    else {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  } finally {
    await handle?.close();
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, host, () =>
  console.log(
    `Catane: Frontiers is ready at http://${host}:${server.address().port}`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
