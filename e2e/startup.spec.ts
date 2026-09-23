import { expect, test } from "@playwright/test";
import { fishingFixture } from "../tests/maritime-fixture";
import { serialize, SAVE_KEY } from "../src/game/save";

const appModule = /\/(?:assets\/App-[^/]+\.js|src\/App\.tsx)(?:\?.*)?$/;

test("normal startup does not wait for the main-thread fallback save engine", async ({
  page,
}) => {
  const text = serialize(fishingFixture().s);
  await page.addInitScript(
    ({ text, key }) => {
      localStorage.setItem(key, text);
      localStorage.setItem("catane-language", "en");
    },
    { text, key: SAVE_KEY },
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // The regular load is validated inside the worker. Failure of the optional
  // main-thread fallback module must not delay or break a normal refresh.
  await page.route(
    /\/(?:assets\/save-[^/]+\.js|src\/game\/save\.ts)(?:\?.*)?$/,
    (route) => route.abort("failed"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".board-frame")).toBeVisible();
  expect(errors).toEqual([]);
});

test("reads the saved campaign while the map and panel module is still loading", async ({
  page,
}) => {
  const text = serialize(fishingFixture().s);
  await page.addInitScript(
    ({ text, key }) => {
      localStorage.setItem(key, text);
      localStorage.setItem("catane-language", "en");
      const Native = window.Worker;
      window.Worker = class extends Native {
        postMessage(value: any) {
          if (value.type === "load") (window as any).campaignReadStarted = true;
          super.postMessage(value);
        }
      };
    },
    { text, key: SAVE_KEY },
  );
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(appModule, async (route) => {
    await held;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Loading campaign…" }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => (window as any).campaignReadStarted))
      .toBe(true);
    await expect(
      page.getByRole("button", { name: /Continue campaign/ }),
    ).toHaveCount(0);
  } finally {
    release();
  }
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".board-frame")).toBeVisible();
});

test("a failed game module offers recovery and leaves the stored campaign untouched", async ({
  page,
}) => {
  const text = serialize(fishingFixture().s);
  await page.addInitScript(
    ({ text, key }) => {
      if (!sessionStorage.getItem("startup-seeded")) {
        localStorage.setItem(key, text);
        sessionStorage.setItem("startup-seeded", "1");
      }
      localStorage.setItem("catane-language", "en");
    },
    { text, key: SAVE_KEY },
  );
  await page.route(appModule, (route) => route.abort("failed"));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "The interface encountered a problem." }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe(text);
  await page.unroute(appModule);
  await page.getByRole("button", { name: "Reload saved campaign" }).click();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".board-frame")).toBeVisible();
});
