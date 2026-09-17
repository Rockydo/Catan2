import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { rebellionFixture } from "../tests/rebellion-fixture";
import { nextRandom } from "../src/game/world";
import { serialize, SAVE_KEY } from "../src/game/save";

test("AI rebellion announces the revived realm, focuses its territory, and persists", async ({
  page,
}) => {
  const s = rebellionFixture();
  s.active = 0;
  // Ending the human turn starts faction 1's AI turn and its rebellion check.
  for (let seed = 0; ; seed++)
    if (nextRandom(seed)[0] < 0.1) {
      s.rebellionRng = seed;
      break;
    }
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    {
      key: SAVE_KEY,
      data: serialize(s),
    },
  );
  // Hold subsequent AI decisions so the event can be inspected without races.
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (e) => e.stopImmediatePropagation());
      }
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  const alert = page.getByTestId("rebellion-alert");
  await expect(alert).toContainText("Golden Vale returns");
  await expect(alert).toContainText("Tidewatch");
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(state.players[3].alive).toBe(true);
  const uprising = state.events.find((e: any) => e.rebellion).rebellion;
  expect(uprising.share).toBeGreaterThanOrEqual(25);
  expect(uprising.share).toBeLessThanOrEqual(45);
  await expect(alert).toContainText(
    `${uprising.towns} ${uprising.towns === 1 ? "town" : "towns"}`,
  );
  await page.screenshot({
    path: `test-artifacts/rebellions-${test.info().project.name}.png`,
  });
  const audit = await new AxeBuilder({ page })
    .include(".rebellion-alert")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations.map((v) => v.id)).toEqual([]);
  await page.getByRole("button", { name: "Show rebel territory" }).click();
  await expect(alert).toHaveCount(0);
  await page
    .getByRole("button", { name: "Realms & chronicle", exact: true })
    .click();
  await expect(page.getByTestId("faction-power-3")).not.toContainText(
    "Eliminated",
  );
  await expect(page.getByLabel("Recent game events")).toContainText(
    "returned in a rebellion",
  );
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  const loaded = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(loaded.rebellionRng).toBe(state.rebellionRng);
  expect(loaded.players[3].alive).toBe(true);
  expect(errors).toEqual([]);
});
