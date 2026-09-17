import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import {
  MilitaryPortrait,
  MilitaryIcon,
  ArmyMiniature,
} from "../src/ui/MilitaryArt";
import { UNIT_INFO, COLORS } from "../src/game/content";
import { funded, piece } from "../tests/helpers";
import { ownTowns } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import { serialize, SAVE_KEY } from "../src/game/save";
import type { UnitClass } from "../src/game/types";
mkdirSync("test-artifacts/military", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const s = funded();
s.players[0].turns = 10;
const town = ownTowns(s)[0];
town.level = town.turnLevel = 4;
const tile = landAtVertex(s, town.vertex)[0];
const units = Object.keys(UNIT_INFO).flatMap((kind, i) =>
  [1, 2, 3, 4].map((tier) => piece(s, tile, 0, kind as UnitClass, tier)),
);
await page.goto("http://127.0.0.1:4173");
await page.setContent(
  '<base href="http://127.0.0.1:4173/"><style>' +
    readFileSync("src/military.css", "utf8") +
    "body{background:#f5f1e3;color:#284842;font-family:Georgia;padding:30px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.card{display:flex;align-items:center;gap:20px;padding:16px;background:#fffbed;border:1px solid #d4d9c5;border-radius:12px}.unit-portrait.military-portrait{width:85px;height:98px}h1{margin-top:0}small{display:block;margin-top:8px;color:#52634e}.strip{display:flex;gap:30px;padding:22px;background:#346d7a;border-radius:12px;margin:20px 0}.caption{color:#f4e3c1;font-family:sans-serif;text-align:center;font-size:13px}</style>" +
    renderToStaticMarkup(
      <>
        <h1>Frontiers · military identity</h1>
        <div className="grid">
          {units.map((u) => (
            <div className="card" key={u.id}>
              <MilitaryPortrait unit={u} />
              <div>
                <b>{UNIT_INFO[u.kind as UnitClass].names[u.tier - 1]}</b>
                <small>
                  {u.kind} · tier {u.tier}
                </small>
                <MilitaryIcon kind={u.kind} tier={u.tier} />
              </div>
            </div>
          ))}
        </div>
        <div className="strip">
          {[...units.filter((u) => u.tier === 1).map((u) => [u]), units].map(
            (group, i) => (
              <div key={i}>
                <svg width="100" height="100" viewBox="-25 -26 50 52">
                  <ArmyMiniature
                    units={group}
                    color={COLORS[i % 4]}
                    selected={false}
                  />
                </svg>
                <div className="caption">
                  {group.length === 1 ? group[0].kind : "Mixed army"}
                </div>
              </div>
            ),
          )}
        </div>
      </>,
    ),
);
await page.waitForFunction(() =>
  Array.from(document.querySelectorAll("image")).every((i) => i.href.baseVal),
);
await page.waitForTimeout(300);
await page.screenshot({
  path: "test-artifacts/military/roster.png",
  fullPage: true,
});
await page.close();
for (const [name, width, height] of [
  ["desktop", 1600, 1000],
  ["mobile", 390, 844],
] as const) {
  const p = await browser.newPage({ viewport: { width, height } });
  await p.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await p.goto("http://127.0.0.1:4173");
  await p.getByRole("button", { name: /Continue campaign/ }).click();
  await p.getByTestId(`town-${town.id}`).click();
  if (
    (await p.getByRole("button", { name: "Actions & realm" }).isVisible()) &&
    !(await p
      .locator(".right-panel")
      .evaluate((e) => e.classList.contains("mobile-open")))
  )
    await p.getByRole("button", { name: "Actions & realm" }).click();
  await p.getByRole("button", { name: "Forces", exact: true }).click();
  await p.screenshot({ path: `test-artifacts/military/${name}-recruit.png` });
  if (await p.getByRole("button", { name: "Close action panel" }).isVisible())
    await p.getByRole("button", { name: "Close action panel" }).click();
  await p.getByTestId(`army-${tile}`).click();
  await p.screenshot({ path: `test-artifacts/military/${name}-army.png` });
  await p.close();
}
await browser.close();
