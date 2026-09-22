import { test, expect, type Page } from "@playwright/test";
import { funded } from "../tests/helpers";
import { ownTowns } from "../src/game/selectors";
import { serialize, SAVE_KEY } from "../src/game/save";

async function load(page: Page, level = 4) {
  const s = funded("map-sprite-check"),
    town = ownTowns(s)[0];
  town.level = town.turnLevel = level;
  town.wall = level === 1 ? 0 : 4;
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

test("town artwork and labels update after walls, city upgrades and extensions", async ({
  page,
}) => {
  const { town } = await load(page, 1);
  const node = page.getByTestId(`town-${town.id}`);
  await node.press("Enter");
  await expect(node).toHaveAttribute("aria-label", /level 1, wall 0/);
  await expect(node.locator(".town-miniature > image")).toHaveCount(1);
  const original = await node
    .locator(".town-miniature > image")
    .getAttribute("href");
  await page.getByRole("button", { name: /^Build Palisade/ }).click();
  await expect(node).toHaveAttribute("aria-label", /level 1, wall 1/);
  await expect(node.locator(".town-miniature > image")).not.toHaveAttribute(
    "href",
    original!,
  );
  for (const [level, name] of [
    [2, "City I"],
    [3, "City II"],
    [4, "City III"],
  ] as const) {
    await page
      .getByRole("button", { name: `Upgrade to ${name}`, exact: false })
      .first()
      .click();
    await expect(node).toHaveAttribute(
      "aria-label",
      new RegExp(`level ${level}, wall 1`),
    );
  }
  await page
    .getByTestId("city-extensions")
    .getByRole("button", { name: /Build extension/ })
    .first()
    .click();
  await expect(node.locator(":scope > title")).toContainText("1 extensions");
});

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
  const close = page.getByRole("button", { name: "Close action panel" });
  if (await close.isVisible()) await close.click();
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
