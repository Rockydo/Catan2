import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WildlifeArt } from "../src/ui/WildlifeArt";
import { WaterDefinitions } from "../src/ui/ConnectedWater";
import { riverGeometry, waterSurfacePath } from "../src/ui/water-connectivity";
import { generateHex } from "../src/game/world";
const cases = [];
for (const river of [true, false])
  for (let mask = 0; mask < 64; mask++) {
    const connections = { river, channel: mask, shore: mask };
    const tile = {
      ...generateHex("clip-regression", "0,0"),
      resource: "water" as const,
      geography: {
        elevation: 0.3,
        region: "temperate:0,0",
        animals: [river ? ("fish" as const) : ("whale" as const)],
      },
    };
    const svg = renderToStaticMarkup(
      createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: 368,
          height: 368,
          viewBox: "-46 -46 92 92",
        },
        createElement(
          "defs",
          null,
          createElement(WaterDefinitions, { connections: [connections] }),
        ),
        createElement(WildlifeArt, { tile, x: 0, y: 0, connections }),
      ),
    );
    cases.push({
      river,
      mask,
      path: river ? riverGeometry(mask).water : waterSurfacePath(mask),
      svg,
    });
  }
console.log(JSON.stringify(cases));
