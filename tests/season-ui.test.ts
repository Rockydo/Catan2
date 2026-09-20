import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductionToken } from "../src/ui/MapPieces";
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
