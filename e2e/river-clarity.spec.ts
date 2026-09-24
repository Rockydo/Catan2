import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

test("river bends retain a broad wet center and continuous clipped bank art", async ({
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
        return [
          [0, 0],
          [15, 0],
          [-15, 0],
          [0, 15],
          [0, -15],
        ].some(([x, y]) => !ctx.isPointInPath(p, x, y))
          ? [i + 1]
          : [];
      });
    }, paths),
  ).toEqual([]);
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
  await expect(page.locator(".connected-water")).toHaveCount(6);
  await expect(page.locator("[data-bank-side]")).toHaveCount(0);
  for (const g of await page.locator(".connected-water").all())
    await expect(g).toHaveAttribute("clip-path", "url(#water-full-hex)");
  await page.screenshot({ path: "test-artifacts/river-wide-banks.png" });
});
