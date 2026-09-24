import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConnectedWater, WaterDefinitions } from "../src/ui/ConnectedWater";
import { FloodDefinitions } from "../src/ui/FloodArt";
import {
  riverGeometry,
  type WaterConnections,
} from "../src/ui/water-connectivity";
import type { Hex } from "../src/game/types";

const paths = Array.from({ length: 63 }, (_, i) => riverGeometry(i + 1).water);
const masks = [1, 3, 5, 9, 21, 63];
const connections: WaterConnections[] = masks.map((channel) => ({
  river: true,
  channel,
  shore: 63 ^ channel,
  basin: 0,
  banks: [
    "seasons/cold-clay-winter.webp",
    "seasons/cold-clay-winter.webp",
    "seasons/desert-clay-summer.webp",
  ],
}));
const tile = {
  id: "0,0",
  q: 0,
  r: 0,
  resource: "water",
  climate: "cold",
  biome: "river",
  number: 6,
  vertices: [],
  edges: [],
  surface: "open",
  geography: { elevation: 0.4, region: "test", waterway: "river" },
} as Hex;
const svg = renderToStaticMarkup(
  createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "-50 -50 300 200",
      width: 1000,
      height: 667,
    },
    createElement(
      "defs",
      null,
      createElement(WaterDefinitions, { connections }),
      createElement(FloodDefinitions),
    ),
    ...connections.map((c, i) =>
      createElement(ConnectedWater, {
        key: i,
        tile,
        connections: c,
        x: (i % 3) * 100,
        y: Math.floor(i / 3) * 100,
        season: "winter",
      }),
    ),
  ),
);

process.stdout.write(JSON.stringify({ paths, svg }));
