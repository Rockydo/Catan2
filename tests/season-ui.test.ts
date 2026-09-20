import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductionToken } from "../src/ui/MapPieces";
import { MapLabelDefinitions } from "../src/ui/MapLabel";
import { RAW } from "../src/game/types";
import { GOOD_INFO } from "../src/game/content";
import { selectHalfForce, selectReadyForce } from "../src/ui/ArmyComposition";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import { setLocale } from "../src/i18n";

it("labels the resource actually produced when a mixed tile has only one seasonal output", () => {
  setLocale("en");
  const markup = renderToStaticMarkup(
    createElement(ProductionToken, {
      resource: "hides",
      output: { wool: 2 },
      number: 8,
      active: false,
      showNumber: true,
    }),
  );
  expect(markup).toContain('aria-label="2 Wool"');
  expect(markup).not.toContain('aria-label="Hides"');
  const dormant = renderToStaticMarkup(
    createElement(ProductionToken, {
      resource: "grain",
      output: {},
      number: 8,
      active: false,
      showNumber: true,
      dormant: true,
    }),
  );
  expect(dormant).toContain('aria-label="0 Grain"');
  expect(dormant).toContain('aria-label="8"');
});

it("uses shared resource symbols and outlined quantities for every single-resource token", () => {
  setLocale("en");
  const definitions = renderToStaticMarkup(createElement(MapLabelDefinitions));
  for (const good of RAW) {
    expect(definitions).toContain(`id="map-resource-${good}"`);
    for (const quantity of [1, 2, 3, 12]) {
      const markup = renderToStaticMarkup(
        createElement(ProductionToken, {
          resource: good,
          output: { [good]: quantity },
          number: 8,
          showNumber: true,
          compact: true,
          active: false,
        }),
      );
      expect(markup).toContain(`href="#map-resource-${good}"`);
      expect(markup).toContain(`data-quantity="${quantity}"`);
      expect(markup).toContain(
        `aria-label="${quantity} ${GOOD_INFO[good].name}"`,
      );
      expect(markup).toContain('aria-label="8"');
      expect(markup).not.toContain("<text");
      expect(markup).not.toContain("<svg");
    }
  }
});

it("keeps both dormant resource icons at zero without changing the dice number", () => {
  setLocale("en");
  const markup = renderToStaticMarkup(
    createElement(ProductionToken, {
      resource: "hides",
      baseOutput: { hides: 1, oil: 1 },
      output: {},
      number: 11,
      showNumber: true,
      compact: true,
      active: false,
      dormant: true,
    }),
  );
  expect(markup).toContain('aria-label="0 Hides + 0 Oil"');
  expect(markup).toContain('href="#map-resource-hides"');
  expect(markup).toContain('href="#map-resource-oil"');
  expect(markup.match(/data-quantity="0"/g)).toHaveLength(2);
  expect(markup).toContain('aria-label="11"');
  expect(markup).toContain("No harvest this season");
});

it("keeps rescued land units separate from a friendly fleet when selecting ready or half a force", () => {
  const { s } = maritimeFixture();
  const army = Array.from({ length: 3 }, () => piece(s, "0,0", 0, "heavy", 2));
  army.forEach((u) => (u.seasonStatus = "adrift"));
  const fleet = Array.from({ length: 3 }, () =>
    piece(s, "0,0", 0, "convoy", 2),
  );
  expect(selectReadyForce(s, [...army, ...fleet])).toEqual(
    army.map((u) => u.id),
  );
  expect(selectHalfForce(s, [...army, ...fleet])).toHaveLength(2);
  expect(
    selectHalfForce(s, [...army, ...fleet]).every((id) =>
      army.some((u) => u.id === id),
    ),
  ).toBe(true);
  fleet.forEach((u) => (u.seasonStatus = "icebound"));
  expect(selectReadyForce(s, [...fleet, ...army])).toEqual(
    army.map((u) => u.id),
  );
});
