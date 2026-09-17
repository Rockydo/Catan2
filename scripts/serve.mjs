import http from "node:http";
import { readFile, stat, realpath } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const port = Number(process.env.PORT || 4173),
  host = process.env.HOST || "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};
await stat(resolve(root, "index.html")).catch(() => {
  console.error("Build the game first: npm run build");
  process.exit(1);
});
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
    const data = await readFile(actual);
    res.setHeader(
      "Content-Type",
      types[extname(actual)] || "application/octet-stream",
    );
    res.setHeader(
      "Cache-Control",
      pathname.startsWith("/assets/") && /-[a-zA-Z0-9_-]{8,}\./.test(pathname)
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    );
    res.setHeader("Content-Length", data.length);
    res.writeHead(200);
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, host, () =>
  console.log(`Catane: Frontiers is ready at http://${host}:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
