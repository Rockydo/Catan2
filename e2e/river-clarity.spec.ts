import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

test("river channels retain width through bends without circular bulges", async ({
  page,
}) => {
  await page.goto("/");
  const { paths, svg }: { paths: string[]; svg: string } = JSON.parse(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "e2e/river-fixture.tsx"],
      { encoding: "utf8" },
    ),
  );
  expect(
    await page.evaluate((paths) => {
      const ctx = document.createElement("canvas").getContext("2d")!;
      return paths.flatMap((d, i) => {
        const p = new Path2D(d);
        return !ctx.isPointInPath(p, 0, 0) ? [i + 1] : [];
      });
    }, paths),
  ).toEqual([]);
  expect(
    await page.evaluate((d) => {
      const ctx = document.createElement("canvas").getContext("2d")!;
      const path = new Path2D(d);
      return [-30, -15, 0, 15, 30].every(
        (x) =>
          ctx.isPointInPath(path, x, 18) &&
          ctx.isPointInPath(path, x, -18) &&
          !ctx.isPointInPath(path, x, 21) &&
          !ctx.isPointInPath(path, x, -21),
      );
    }, paths[8]),
  ).toBe(true);
  // The upstream pocket is visibly wider than the 38-unit channel, while
  // every variant retains exactly the same 38-unit opening at the hex edge.
  expect(
    await page.evaluate((paths) => {
      const ctx = document.createElement("canvas").getContext("2d")!;
      return Array.from({ length: 5 }, (_, v) => {
        const source = new Path2D(paths[v * 63]);
        const body = new Path2D(paths[v * 63 + 8]);
        return (
          ctx.isPointInPath(source, -4, 24) &&
          ctx.isPointInPath(source, -4, -24) &&
          !ctx.isPointInPath(body, -4, 24) &&
          !ctx.isPointInPath(body, -4, -24) &&
          [source, body].every(
            (p) =>
              ctx.isPointInPath(p, 38, 18) &&
              ctx.isPointInPath(p, 38, -18) &&
              !ctx.isPointInPath(p, 38, 20) &&
              !ctx.isPointInPath(p, 38, -20),
          )
        );
      }).every(Boolean);
    }, paths),
  ).toBe(true);
  expect(new Set([0, 1, 2, 3, 4].map((v) => paths[v * 63 + 8])).size).toBe(5);
  await page.setContent(
    `<style>body{margin:0;background:#2c6071;display:grid;place-items:center}</style>${svg}`,
  );
  await page.evaluate(async () => {
    await Promise.all(
      [...document.querySelectorAll("image")].map(
        (el) =>
          new Promise<void>((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve();
            im.onerror = () => reject(new Error(el.getAttribute("href")!));
            im.src = el.getAttribute("href")!;
          }),
      ),
    );
  });
  await expect(page.locator(".connected-water")).toHaveCount(12);
  await expect(page.locator("[data-bank-side]")).toHaveCount(0);
  for (const g of await page.locator(".connected-water").all())
    await expect(g).toHaveAttribute("clip-path", "url(#water-full-hex)");
  await page.screenshot({
    path: "test-artifacts/river-wide-banks.png",
    fullPage: true,
  });
});
