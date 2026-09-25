import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { serialize, assertInvariants, SAVE_KEY } from "../src/game/save";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { generateWorld } from "../src/game/world";
import { syncSeasonSurfaces } from "../src/game/seasons";

for (const locale of ["en", "fr"])
  test(`ford stones stay visible without map labels, with accessible status in ${locale}`, async ({
    page,
  }) => {
    let s = newGame("ford-clarity");
    while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
    s.phase = "economy";
    const river = Object.values(s.tiles).filter(
      (t) => t.geography?.waterway === "river",
    );
    expect(river.length).toBeGreaterThanOrEqual(4);
    for (const tile of river) {
      tile.geography!.ford = true;
      tile.geography!.access = "normal";
      tile.surface = "open";
    }
    river[0].geography!.access = "ford";
    river[2].surface = "frozen";
    river[3].geography!.projects = { bridge: { owner: 0, born: 1 } };
    assertInvariants(s);
    await page.addInitScript(
      ({ key, data, locale }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { key: SAVE_KEY, data: serialize(s), locale },
    );
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      })
      .click();
    const labels =
      locale === "en"
        ? ["Ford open", "Ford closed", "Ice crossing", "Bridge open"]
        : ["Gué ouvert", "Gué fermé", "Passage sur glace", "Pont ouvert"];
    for (let i = 0; i < 4; i++) {
      const hex = page.getByTestId(`hex-${river[i].id}`);
      await expect(hex).toHaveAttribute("aria-label", new RegExp(labels[i]));
      await hex.click();
      await page.getByTestId("inspector-details-toggle").click();
      await expect(page.locator(".ford-status strong")).toHaveText(labels[i]);
    }
    await page.getByTestId(`hex-${river[0].id}`).click();
    await page.getByTestId("inspector-details-toggle").click();
    await expect(page.locator(".open-ford-crossing")).toHaveCount(1);
    await expect(page.locator(".submerged-ford-crossing")).toHaveCount(1);
    await expect(page.locator("[data-ford-status]")).toHaveCount(0);
    await expect(page.locator(".submerged-ford-crossing")).toHaveAttribute(
      "opacity",
      "0.82",
    );
    await expect(page.locator(".open-ford-crossing")).toHaveAttribute(
      "opacity",
      "1",
    );
    await page.screenshot({
      path: `output/fords/ford-status-${locale}.png`,
      fullPage: true,
    });
    await page.locator(".map-view-select").selectOption("access");
    await expect(page.locator("[data-ford-status]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

test("open and submerged ford decorations preserve the accelerated renderer on large maps", async ({
  page,
}) => {
  const s = newGame("ford-clarity");
  Object.assign(s, generateWorld(s.seed, 850, true));
  syncSeasonSurfaces(s);
  const rivers = Object.values(s.tiles).filter(
    (t) => t.geography?.waterway === "river",
  );
  expect(rivers.length).toBeGreaterThan(0);
  for (const [i, t] of rivers.slice(0, 8).entries()) {
    t.geography!.ford = true;
    t.geography!.access = i % 2 ? "normal" : "ford";
    t.surface = "open";
  }
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".open-ford-crossing").first()).toBeAttached();
  await expect(page.locator(".submerged-ford-crossing").first()).toBeAttached();
  await expect(page.locator(".terrain-canvas")).toHaveAttribute(
    "data-terrain-status",
    "ready",
    { timeout: 30000 },
  );
});
