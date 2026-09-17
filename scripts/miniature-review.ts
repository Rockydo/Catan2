import { chromium } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TownMiniature, ShipMiniature } from "../src/ui/MapPieces";
import { COLORS, NAMES, SHIP_INFO } from "../src/game/content";
import { ownTowns } from "../src/game/selectors";
import { funded } from "../tests/helpers";
const folder = `test-artifacts/${process.env.PASS ?? "polish-final"}`;
mkdirSync(folder, { recursive: true });
const town = ownTowns(funded())[0];
const svg = h(
  "svg",
  { viewBox: "0 0 1000 690", width: 1000, height: 690 },
  h("rect", { width: 1000, height: 690, fill: "#245466" }),
  ...NAMES.flatMap((name, row) => [
    h(
      "text",
      { x: 25, y: row * 125 + 48, fill: "#f0e5c7", fontSize: 14 },
      name,
    ),
    ...[1, 2, 3, 4].map((level) =>
      h(
        "g",
        {
          transform: `translate(${235 + (level - 1) * 195} ${row * 125 + 72})`,
        },
        h(
          "g",
          { transform: "scale(1.9)" },
          h(TownMiniature, {
            town: {
              ...town,
              owner: row,
              level,
              wall: level > 1 ? level - 1 : 0,
              extensions: {},
            },
            color: COLORS[row],
            selected: false,
          }),
        ),
        h(
          "text",
          { y: 53, textAnchor: "middle", fill: "#dee6d3", fontSize: 12 },
          ["", "Settlement", "City I", "City II", "City III"][level],
        ),
      ),
    ),
  ]),
  ...Object.entries(SHIP_INFO).map(([kind, info], i) =>
    h(
      "g",
      { transform: `translate(${215 + i * 195} 550)` },
      h("g", { transform: "scale(1.4)" }, h(ShipMiniature, { kind })),
      h(
        "text",
        { x: 30, y: 95, textAnchor: "middle", fill: "#dee6d3", fontSize: 12 },
        info.name,
      ),
    ),
  ),
);
const browser = await chromium.launch({
  executablePath: existsSync("/usr/bin/chromium")
    ? "/usr/bin/chromium"
    : undefined,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 690 } });
await page.setContent(
  `<body style="margin:0;font-family:system-ui">${renderToStaticMarkup(svg)}</body>`,
);
await page.screenshot({ path: `${folder}/miniatures.png` });
await browser.close();
