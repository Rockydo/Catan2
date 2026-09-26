import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import {
  EXTRA_LANDFORMS,
  EXTRA_LANDFORM_IDS,
} from "../src/game/landform-catalogue";
import { regionalLandform } from "../src/game/physical-landforms";
import seeds from "../tests/geography-v10-seeds.json" with { type: "json" };
for (const [index, form] of EXTRA_LANDFORM_IDS.entries())
  test(`renders ${form} with its landscape description`, async ({ page }) => {
    let s = newGame(
      seeds[form][0],
      Array.from({ length: 12 }, (_, i) => ({
        name: `Realm ${i + 1}`,
        control: i === 0 ? ("human" as const) : ("standard" as const),
      })),
    );
    while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
    s.active = 0;
    s.phase = "economy";
    const locale = index % 2 ? "fr" : "en",
      info = EXTRA_LANDFORMS[form];
    const t = Object.values(s.tiles).find(
      (t) =>
        regionalLandform(s.seed, t.id, 10) === form &&
        !["water", "ice", "peaks"].includes(t.resource),
    )!;
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      ({ key, data, locale }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { key: SAVE_KEY, data: serialize(s), locale },
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      })
      .click();
    await page.getByTestId(`hex-${t.id}`).click();
    await page.getByTestId("inspector-details-toggle").click();
    const label = page.locator(".landform-label");
    await expect(label).toContainText(info[locale]);
    await expect(label).toHaveAttribute(
      "title",
      info[locale === "en" ? "detail" : "detailFr"],
    );
    await page.screenshot({ path: `output/geography10/${form}.png` });
    expect(errors).toEqual([]);
  });
