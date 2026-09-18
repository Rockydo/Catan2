import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Recruitment } from "../src/ui/Recruitment";
import { BIOME_INFO, type Biome } from "../src/game/climate-content";
import { maritimeFixture } from "./maritime-fixture";
import { applyCommand } from "../src/game/engine";

it.each([
  "snow-plain",
  "desert",
  "ice",
  "rice-field",
  "steppe-plain",
] as Biome[])(
  "opens Forces and recruits next to %s without looking it up as a resource",
  (biome) => {
    const { s, home } = maritimeFixture();
    Object.assign(s.tiles["0,0"], {
      biome,
      resource: BIOME_INFO[biome].resource,
    });
    const html = renderToStaticMarkup(
      createElement(Recruitment, {
        game: s,
        town: home,
        viewer: 0,
        interactive: true,
        onAction: () => {},
        onTown: () => {},
      }),
    );
    expect(html).toContain(`${BIOME_INFO[biome].name} · 0,0`);
    const result = applyCommand(s, {
      type: "recruit",
      town: home.id,
      tile: "0,0",
      kind: "heavy",
      tier: 1,
    });
    expect(result.ok, result.error).toBe(true);
    expect(Object.values(result.state.pieces)).toHaveLength(1);
  },
);
