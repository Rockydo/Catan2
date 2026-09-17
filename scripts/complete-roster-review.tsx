import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { MilitaryPortrait } from "../src/ui/MilitaryArt";
import { UNIT_INFO, SHIP_NAMES, ROMAN } from "../src/game/content";
const groups = [
  ...Object.entries(UNIT_INFO).map(([kind, info]) => ({
    kind,
    names: info.names,
    naval: false,
  })),
  ...Object.entries(SHIP_NAMES).map(([kind, names]) => ({
    kind,
    names,
    naval: true,
  })),
];
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/");
  const html =
    '<base href="http://127.0.0.1:4173/"><style>' +
    readFileSync("src/military.css", "utf8") +
    "body{margin:0;padding:26px;background:#f4eddd;color:#28483f;font-family:Georgia}.row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:12px}.card{display:flex;align-items:center;gap:20px;padding:15px;background:#fffbef;border:1px solid #dbcead;border-radius:12px}.card b{font-size:16px}.card small{display:block;margin-top:8px;font:12px system-ui;color:#596459}.unit-portrait.military-portrait{width:90px;height:102px}h2{font-size:14px;text-transform:uppercase;letter-spacing:.18em;margin:22px 0 12px}</style>" +
    renderToStaticMarkup(
      <>
        <h1>Frontiers · Complete illustrated roster</h1>
        {groups.map((g) => (
          <section key={g.kind}>
            <h2>{g.kind}</h2>
            <div className="row">
              {g.names.map((name, i) => (
                <div className="card" key={name}>
                  <MilitaryPortrait
                    unit={{
                      kind: g.kind as any,
                      tier: i + 1,
                      naval: g.naval,
                      owner: i % 4,
                    }}
                  />
                  <div>
                    <b>{name}</b>
                    <small>Tier {ROMAN[i + 1]}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </>,
    );
  await page.setContent(html);
  await expect(page.locator(".military-portrait image")).toHaveCount(44);
  const assets = await page
    .locator(".military-portrait image")
    .evaluateAll((images) => [
      ...new Set(images.map((i) => (i as SVGImageElement).href.baseVal)),
    ]);
  await page.evaluate(async (assets) => {
    await Promise.all(
      assets.map(
        (src) =>
          new Promise<void>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve();
            i.onerror = () => reject(new Error(src));
            i.src = src;
          }),
      ),
    );
  }, assets);
  expect(assets).toHaveLength(9);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-artifacts/complete-roster.png",
    fullPage: true,
  });
  for (const kind of ["merchant", "fishing", "merchantship"])
    await page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: kind, exact: true }) })
      .screenshot({ path: `test-artifacts/roster-${kind}-detail.png` });
  writeFileSync(
    "test-artifacts/complete-roster-review.json",
    JSON.stringify(
      {
        portraits: 44,
        artSheets: assets.length,
        assets,
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log("All 44 portraits rendered; all 9 painted art sheets loaded.");
} finally {
  await browser.close();
}
