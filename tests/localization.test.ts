import { afterEach, describe, expect, it } from "vitest";
import { getLocale, localize, setLocale } from "../src/i18n";
import { CARDS, COSTS, GOOD_INFO } from "../src/game/content";
import { GUILDS } from "../src/game/guilds";
import french from "../src/i18n/fr.json";
import chapters from "../src/rules/chapters.json";
import font from "../src/ui/map-font.json";
afterEach(() => setLocale("en"));
describe("French presentation", () => {
  it("uses official base-game names without changing IDs or non-text values", () => {
    setLocale("fr");
    const terms = {
      Wood: "Bois",
      Clay: "Argile",
      Wool: "Laine",
      Grain: "Blé",
      "Iron ore": "Minerai",
      Settlement: "Colonie",
      Road: "Route",
      "Road Building": "Construction de routes",
    };
    for (const [en, fr] of Object.entries(terms))
      expect(localize(en).toLowerCase()).toBe(fr.toLowerCase());
    const command = { type: "build", good: "grain", owner: 0 };
    expect(localize(command)).toBe(command);
    expect(localize(123)).toBe(123);
    expect(localize("Lancer")).toBe("Lancier");
    setLocale("en");
    expect(getLocale()).toBe("en");
    expect(localize("Grain")).toBe("Grain");
  });
  it("covers every live recipe, card and guild contract", () => {
    setLocale("fr");
    const unchanged = new Set([
      "Forge I",
      "Forge II",
      "Forge III",
      "Bastion",
      "Rations",
    ]);
    const texts = [
      ...Object.keys(COSTS),
      ...Object.values(GOOD_INFO).map((g) => g.name),
      ...Object.values(CARDS).flatMap((c) => [c.name, c.text]),
      ...Object.values(GUILDS).flatMap((g) => [g.name, g.purpose, ...g.tiers]),
    ];
    for (const text of texts)
      if (!unchanged.has(text)) expect(localize(text), text).not.toBe(text);
  });
  it("does not cache partial translations or swallow unknown messages", () => {
    setLocale("fr");
    expect(localize("Chemical works III")).toBe("Usine chimique III");
    expect(localize("3 Grain")).toBe("3 Blé");
    expect(localize("Emberhold")).toBe("Emberhold");
    expect(localize("An unrecognized sentence")).toBe(
      "An unrecognized sentence",
    );
    expect(localize("2 MP")).toBe("2 PM");
    for (const [source, target] of Object.entries(french)) {
      const tokens = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort();
      expect(tokens(target), source).toEqual(tokens(source));
    }
  });
  it("has matching complete bilingual chapters and accented vector glyphs", () => {
    expect(chapters).toHaveLength(12);
    expect(new Set(chapters.map((c) => c.id)).size).toBe(12);
    for (const c of chapters) {
      expect(c.body.en.length).toBeGreaterThan(500);
      expect(c.body.fr.length).toBeGreaterThan(500);
      expect(c.body.en.split("## ").length).toBe(c.body.fr.split("## ").length);
      expect(c.body.en + c.body.fr).not.toContain("\u2014");
    }
    const serialized = JSON.stringify(font);
    for (const c of ["é", "è", "ê", "É", "ç", "û", "œ"])
      expect(serialized).toContain(c);
  });
});
