import { test, expect, type Page } from "@playwright/test";
import { funded } from "../tests/helpers";
import { ownTowns } from "../src/game/selectors";
import { serialize, SAVE_KEY } from "../src/game/save";

async function load(page: Page) {
  const s = funded("map-sprite-check"),
    town = ownTowns(s)[0];
  town.level = town.turnLevel = 4;
  town.wall = 4;
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "en");
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  return { s, town };
}

test("cached map vectors keep complete references, labels, selection and dice toggling", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const { town } = await load(page);
  const townNode = page.getByTestId(`town-${town.id}`);
  await expect(townNode.locator(".town-miniature > image")).toHaveCount(1);
  await expect(
    page.locator(".production-token-art > image").first(),
  ).toBeAttached();
  const problems = await page
    .locator(".town-miniature > image, .production-token-art > image")
    .evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        const source = decodeURIComponent(
          node.getAttribute("href")!.split(",").slice(1).join(","),
        );
        const xml = new DOMParser().parseFromString(source, "image/svg+xml");
        const unresolved = Array.from(xml.querySelectorAll("use")).filter(
          (use) => !xml.getElementById(use.getAttribute("href")!.slice(1)),
        );
        return xml.querySelector("parsererror") || unresolved.length
          ? [source]
          : [];
      }),
    );
  expect(problems).toEqual([]);
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    SAVE_KEY,
  );
  await townNode.press("Enter");
  await expect
    .poll(async () =>
      decodeURIComponent(
        (await townNode
          .locator(".town-miniature > image")
          .getAttribute("href")) ?? "",
      ),
    )
    .toContain("selection-halo");
  const label = page.locator(".production-resources").first();
  await expect(label).toHaveAttribute("aria-label", /.+/);
  await page.getByRole("button", { name: "Hide dice numbers" }).click();
  await expect(page.locator(".production-token[data-number]")).toHaveCount(0);
  await page.getByRole("button", { name: "Show dice numbers" }).click();
  await expect(
    page.locator(".production-token[data-number]").first(),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe(saved);
  expect(errors).toEqual([]);
});

test("failed sprite decoding keeps the original playable vectors", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLImageElement.prototype.decode = () =>
      Promise.reject(new Error("Test decode failure"));
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const { town } = await load(page);
  const townNode = page.getByTestId(`town-${town.id}`);
  await expect(townNode.locator(".town-miniature path").first()).toBeVisible();
  await expect(
    page.locator(".production-token-art circle").first(),
  ).toBeVisible();
  await expect(page.locator(".town-miniature > image")).toHaveCount(0);
  await townNode.press("Enter");
  await expect(townNode.locator(".selection-halo")).toBeVisible();
  expect(errors).toEqual([]);
});
