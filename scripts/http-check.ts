import assert from "node:assert/strict";
const base = "http://127.0.0.1:4173";
for (const path of [
  "/",
  "/rules.html",
  "/rules-fr.html",
  "/assets/unit-roster.png",
  "/favicon.svg",
]) {
  const r = await fetch(base + path);
  assert.equal(r.status, 200, path);
  assert.match(
    r.headers.get("content-security-policy") ?? "",
    /default-src 'self'/,
  );
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  await r.arrayBuffer();
}
for (const path of [
  "/no-such-file",
  "/%2e%2e/package.json",
  "/..%2f..%2fetc/passwd",
  "/%00",
  "/%5cetc%5cpasswd",
]) {
  const r = await fetch(base + path);
  assert.equal(r.status, 404, path);
}
assert.equal((await fetch(base, { method: "POST", body: "x" })).status, 405);
const head = await fetch(base, { method: "HEAD" });
assert.equal(head.status, 200);
assert.equal(await head.text(), "");
console.log(
  "12 production HTTP checks passed: assets, rules, security headers, traversal, methods and HEAD.",
);
