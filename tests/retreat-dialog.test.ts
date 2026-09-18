import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { BattleDialog } from "../src/ui/dialogs";
import { BIOME_INFO, type Biome } from "../src/game/climate-content";
import { terrainName } from "../src/game/maritime";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";

it.each([
  "snow-plain",
  "desert",
  "ice",
  "rice-field",
  "steppe-plain",
] as Biome[])(
  "renders a retreat to %s using its terrain name, including terrain without a resource",
  (biome) => {
    const { s } = maritimeFixture();
    const attacker = piece(s, "-1,0", 1, "heavy", 2);
    const defender = piece(s, "0,0", 0, "heavy", 1);
    const survivor = piece(s, "0,0", 0, "heavy", 1);
    Object.assign(s.tiles["1,0"], {
      biome,
      resource: BIOME_INFO[biome].resource,
    });
    s.battle = {
      attacker: 1,
      defender: 0,
      attackers: [attacker.id],
      defenders: [defender.id, survivor.id],
      origin: "-1,0",
      target: "0,0",
      naval: false,
      attackerPower: 3,
      defenderPower: 2,
      loser: 0,
      loss: 1,
      required: 1,
    };
    const html = renderToStaticMarkup(
      createElement(BattleDialog, { game: s, onAction: () => {} }),
    );
    expect(html).toContain(`${terrainName(s.tiles["1,0"])} · 1,0`);
  },
);
