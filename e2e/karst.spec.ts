import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import {
  serialize,
  SAVE_KEY,
  deserialize,
  assertInvariants,
} from "../src/game/save";
import { regionalLandform } from "../src/game/physical-landforms";
test("karst campaign loads, names its terrain and renders the regional relief", async ({
  page,
}) => {
  let s = newGame(
    "karst-survey-56",
    Array.from({ length: 12 }, (_, i) => ({
      name: `Realm ${i + 1}`,
      control: i === 0 ? ("human" as const) : ("standard" as const),
    })),
  );
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  s.phase = "economy";
  s.active = 0;
  expect(s.geographyVersion).toBe(10);
  expect(Object.keys(s.tiles)).toHaveLength(320);
  assertInvariants(deserialize(serialize(s)));
  const t = Object.values(s.tiles).find(
    (t) =>
      regionalLandform(s.seed, t.id, 10) === "karst-uplands" &&
      !["water", "ice", "peaks"].includes(t.resource),
  )!;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "en");
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByTestId(`hex-${t.id}`).click();
  await page.getByTestId("inspector-details-toggle").click();
  await expect(page.locator(".landform-label")).toContainText("Karst uplands");
  await page.screenshot({ path: "output/landforms/karst-campaign.png" });
  expect(errors).toEqual([]);
});
