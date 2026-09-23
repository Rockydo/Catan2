import { test, expect, type Page } from "@playwright/test";
import { funded, piece } from "../tests/helpers";
import { ownTowns } from "../src/game/selectors";
import { serialize, SAVE_KEY } from "../src/game/save";
import { fishingFixture } from "../tests/maritime-fixture";
import { guildFixture } from "../tests/guild-fixture";
import { landAtVertex, neighbors } from "../src/game/world";
import { SHIP_INFO } from "../src/game/content";
import type { Game, ShipClass } from "../src/game/types";

// Capture preparation inputs in the disposable test browser. The shipped DOM
// contains only the finished image; source SVGs are not retained for testing.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode;
    const sources = new WeakMap<HTMLImageElement, string>();
    const spriteSources: Record<string, string> = {};
    const spriteTypes: Record<string, string> = {};
    const createURL = URL.createObjectURL;
    URL.createObjectURL = function (value) {
      const url = createURL.call(URL, value);
      if (value instanceof Blob) spriteTypes[url] = value.type;
      return url;
    };
    Object.assign(window, { spriteSources, spriteTypes });
    HTMLImageElement.prototype.decode = function () {
      if (this.src.startsWith("data:image/svg+xml"))
        sources.set(this, this.src);
      else if (this.src.startsWith("blob:") && sources.has(this))
        spriteSources[this.src] = sources.get(this)!;
      return decode.call(this);
    };
  });
});

async function importArmies(page: Page, game: Game) {
  await page.locator("input[type=file]").setInputFiles({
    name: "army-art.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(game)),
  });
  await expect(
    page.getByText("Game imported. AI is paused until you resume."),
  ).toBeVisible();
}

function armies() {
  const { s, home, water } = fishingFixture();
  const land = landAtVertex(s, home.vertex)[0];
  const other = neighbors(land).find(
    (id) => s.tiles[id]?.resource === "grain",
  )!;
  for (const tile of [land, other]) {
    piece(s, tile, 0, "heavy", 4);
    piece(s, tile, 0, "light", 1);
    piece(s, tile, 0, "merchant", 3);
    piece(s, tile, 0, "settler", 1);
  }
  piece(s, other, 0, "heavy", 4);
  for (const kind of Object.keys(SHIP_INFO) as ShipClass[])
    piece(s, water, 0, kind, kind === "settlership" ? 1 : 4);
  return { s, home, water, land, other };
}

test("army artwork is shared across counts, updates each class tier, and keeps civilian markers live", async ({
  page,
}) => {
  const { s, land, other, water } = armies();
  await page.goto("/");
  await importArmies(page, s);
  const army = page.getByTestId(`army-${land}`),
    second = page.getByTestId(`army-${other}`);
  const art = army.locator(".army-miniature-art > image");
  await expect(art).toHaveCount(1);
  const initial = await art.getAttribute("href");
  await expect(second.locator(".army-miniature-art > image")).toHaveAttribute(
    "href",
    initial!,
  );
  await expect(army.getByRole("img", { name: "4", exact: true })).toHaveCount(
    1,
  );
  await expect(second.getByRole("img", { name: "5", exact: true })).toHaveCount(
    1,
  );
  await expect(army.getByTestId("economic-unit-marker")).toHaveCount(1);
  await expect(army.getByTestId("settler-unit-marker")).toHaveCount(1);

  const fleet = page.getByTestId(`army-${water}`);
  const shipArt = fleet.locator(".army-miniature-art > image");
  await expect(shipArt).toHaveAttribute("height", "64");
  expect(
    await shipArt.evaluate((node) => {
      const source = decodeURIComponent(
        (
          (window as unknown as { spriteSources: Record<string, string> })
            .spriteSources[node.getAttribute("href")!] ??
          node.getAttribute("href")!
        )
          .split(",")
          .slice(1)
          .join(","),
      );
      const xml = new DOMParser().parseFromString(source, "image/svg+xml");
      return {
        valid: !xml.querySelector("parsererror"),
        glyphs: xml.querySelectorAll('svg[viewBox="0 0 32 32"]').length,
      };
    }),
  ).toEqual({ valid: true, glyphs: 7 });
  await expect(fleet.getByTestId("economic-unit-marker")).toHaveCount(1);
  await expect(fleet.getByTestId("settler-unit-marker")).toHaveCount(1);

  // Counts are live while the decorative URL remains reusable after recruitment.
  piece(s, land, 0, "heavy", 4);
  await importArmies(page, s);
  await expect(army.getByRole("img", { name: "5", exact: true })).toHaveCount(
    1,
  );
  await expect(art).toHaveAttribute("href", initial!);
  // The overall tier stays IV, but a tier change in another class changes its glyph.
  Object.values(s.pieces).find(
    (u) => u.tile === land && u.kind === "light",
  )!.tier = 3;
  await importArmies(page, s);
  await expect(art).not.toHaveAttribute("href", initial!);
  const upgraded = await art.getAttribute("href");
  await army.press("Enter");
  await expect(art).not.toHaveAttribute("href", upgraded!);
  await expect(army).toHaveAttribute("aria-label", /5 pieces.*base power/);
  await expect(army.locator("[data-unit-kinds]")).toHaveAttribute(
    "data-unit-kinds",
    "heavy,light,merchant,settler",
  );
});

test("army decode failures leave all original unit symbols, counts and selection working", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLImageElement.prototype.decode = () =>
      Promise.reject(new Error("Test decode failure"));
  });
  const { s, land, water } = armies();
  await page.goto("/");
  await importArmies(page, s);
  const army = page.getByTestId(`army-${land}`),
    fleet = page.getByTestId(`army-${water}`);
  await expect(army.locator(".army-miniature-art > image")).toHaveCount(0);
  await expect(army.locator(".army-miniature-art svg")).toHaveCount(4);
  await expect(fleet.locator(".army-miniature-art svg")).toHaveCount(7);
  await expect(army.getByRole("img", { name: "4", exact: true })).toHaveCount(
    1,
  );
  await army.press("Enter");
  await expect(
    army.locator('.army-miniature-art path[stroke="#ffe39b"]'),
  ).toHaveCount(1);
  await expect(army.getByTestId("economic-unit-marker")).toHaveCount(1);
});

for (const fallback of [false, true])
  test(`guild and tower artwork retains labels, tier changes and click targets${fallback ? " when decoding fails" : ""}`, async ({
    page,
  }) => {
    if (fallback)
      await page.addInitScript(() => {
        HTMLImageElement.prototype.decode = () =>
          Promise.reject(new Error("Test decode failure"));
      });
    const { s, home } = guildFixture("artisans");
    home.guilds = [
      home.guild!,
      { kind: "builders", tier: 2, born: 0, used: false, auto: false },
    ];
    delete home.guild;
    const tower = {
      id: `w${s.nextId++}`,
      owner: 0,
      vertex: home.vertex,
      tier: 1,
    };
    s.towers[home.vertex] = tower;
    await page.goto("/");
    await importArmies(page, s);
    const guild = page.getByTestId(`guild-badge-${home.id}`);
    const crest = guild.locator(".guild-miniature-art");
    const towerNode = page.getByTestId(`tower-${home.vertex}`);
    await expect(crest).toHaveAttribute("aria-label", "Artisans’ Guild I");
    await expect(
      guild.getByRole("img", { name: "Artisans’ Guild I", exact: true }),
    ).toHaveCount(1);
    await expect(guild.locator("text")).toHaveText("2");
    await expect(towerNode).toHaveAttribute("aria-label", /tier 1/);
    await expect(crest.locator(":scope > image")).toHaveCount(fallback ? 0 : 1);
    await expect(towerNode.locator(".tower-miniature-art > image")).toHaveCount(
      fallback ? 0 : 1,
    );
    const oldCrest = fallback
      ? null
      : await crest.locator(":scope > image").getAttribute("href");
    const oldTower = fallback
      ? null
      : await towerNode
          .locator(".tower-miniature-art > image")
          .getAttribute("href");
    await towerNode.click();
    await expect(page.getByLabel("Watchtower", { exact: true })).toContainText(
      "+1",
    );
    home.guilds[0].tier = 3;
    tower.tier = 4;
    await importArmies(page, s);
    await expect(crest).toHaveAttribute("aria-label", "Artisans’ Guild III");
    await expect(towerNode).toHaveAttribute("aria-label", /tier 4/);
    if (!fallback) {
      await expect(crest.locator(":scope > image")).not.toHaveAttribute(
        "href",
        oldCrest!,
      );
      await expect(
        towerNode.locator(".tower-miniature-art > image"),
      ).not.toHaveAttribute("href", oldTower!);
    }
    await towerNode.press("Enter");
    await expect(page.getByLabel("Watchtower", { exact: true })).toContainText(
      "+4",
    );
  });

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
  await expect(page.locator(".world-map")).toBeVisible();
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
          (
            (window as unknown as { spriteSources: Record<string, string> })
              .spriteSources[node.getAttribute("href")!] ??
            node.getAttribute("href")!
          )
            .split(",")
            .slice(1)
            .join(","),
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
      townNode
        .locator(".town-miniature > image")
        .evaluate((node) =>
          decodeURIComponent(
            (window as unknown as { spriteSources: Record<string, string> })
              .spriteSources[node.getAttribute("href")!] ?? "",
          ),
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

test("stalled image preparation reveals playable vectors and late images preserve the current selection", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode;
    const pending: (() => void)[] = [];
    let released = false;
    HTMLImageElement.prototype.decode = function () {
      const decoded = decode.call(this);
      if (released) return decoded;
      return new Promise<void>((resolve, reject) => {
        // Catch decoding failures immediately while the artificial gate is held.
        const settled = decoded.then(
          () => () => resolve(),
          (e) => () => reject(e),
        );
        pending.push(() => {
          void settled.then((finish) => finish());
        });
      });
    };
    Object.assign(window, {
      releaseSpriteDecodes: () => {
        released = true;
        pending.splice(0).forEach((finish) => finish());
      },
    });
  });
  const { town } = await load(page);
  const node = page.getByTestId(`town-${town.id}`);
  await expect(page.locator(".map-camera-layer")).toBeVisible();
  await expect(node.locator(".town-miniature > image")).toHaveCount(0);
  await expect(node.locator(".town-miniature path").first()).toBeVisible();
  await node.press("Enter");
  await expect(node.locator(".selection-halo")).toBeVisible();
  await page.evaluate(() =>
    (
      window as unknown as { releaseSpriteDecodes: () => void }
    ).releaseSpriteDecodes(),
  );
  const image = node.locator(".town-miniature > image");
  await expect(image).toHaveCount(1);
  expect(
    await image.evaluate((node) =>
      decodeURIComponent(
        (window as unknown as { spriteSources: Record<string, string> })
          .spriteSources[node.getAttribute("href")!] ?? "",
      ),
    ),
  ).toContain("selection-halo");
  expect(errors).toEqual([]);
});

test.describe("prepared sprite quality", () => {
  test.use({ deviceScaleFactor: 2 });

  test("lossless sprites cover maximum zoom at high DPI, with no regeneration on camera input", async ({
    page,
  }) => {
    const { s, home, land } = armies();
    home.level = home.turnLevel = 4;
    home.wall = 4;
    home.guilds = [
      { kind: "artisans", tier: 3, born: 0, used: false, auto: false },
    ];
    s.towers[home.vertex] = {
      id: `w${s.nextId++}`,
      owner: 0,
      vertex: home.vertex,
      tier: 4,
    };
    await page.goto("/");
    await importArmies(page, s);
    const selector =
      ".town-miniature > image, .production-token-art > image, .army-miniature-art > image, .guild-miniature-art > image, .tower-miniature-art > image";
    await expect(page.locator(".guild-miniature-art > image")).toHaveCount(1);
    await page.waitForLoadState("networkidle");
    // Compare the prepared PNG to the exact source vectors at its full pixel
    // resolution. This catches missing definitions, crops, shadows and glyphs.
    const comparison = await page
      .locator(selector)
      .evaluateAll(async (nodes) => {
        const sources = (
          window as unknown as { spriteSources: Record<string, string> }
        ).spriteSources;
        const unique = [...new Set(nodes.map((n) => n.getAttribute("href")!))];
        let mismatched = 0,
          blank = 0,
          nonPng = 0;
        for (const url of unique) {
          // Production CSP permits blob images, but deliberately disallows
          // fetching blob URLs. Read the MIME captured at creation instead.
          if (
            (window as unknown as { spriteTypes: Record<string, string> })
              .spriteTypes[url] !== "image/png"
          )
            nonPng++;
          const actual = new Image(),
            expected = new Image();
          actual.src = url;
          expected.src = sources[url];
          await Promise.all([actual.decode(), expected.decode()]);
          const canvas = document.createElement("canvas");
          canvas.width = actual.naturalWidth;
          canvas.height = actual.naturalHeight;
          const context = canvas.getContext("2d", {
            willReadFrequently: true,
          })!;
          context.drawImage(actual, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(expected, 0, 0, canvas.width, canvas.height);
          const reference = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          // Canvas -> PNG -> canvas rounds premultiplied alpha twice in Firefox.
          // Compare visible channels within two of 255 levels, not undefined RGB
          // hidden behind transparent pixels. Chromium matches exactly.
          if (
            pixels.some((n, i) => {
              if (i % 4 === 3) return Math.abs(n - reference[i]) > 2;
              const alpha = i - (i % 4) + 3;
              return (
                Math.abs(
                  (n * pixels[alpha]) / 255 -
                    (reference[i] * reference[alpha]) / 255,
                ) > 2
              );
            })
          )
            mismatched++;
          if (!pixels.some((n, i) => i % 4 === 3 && n > 0)) blank++;
        }
        return { images: unique.length, mismatched, blank, nonPng };
      });
    expect(comparison.images).toBeGreaterThan(5);
    expect(comparison).toMatchObject({ mismatched: 0, blank: 0, nonPng: 0 });
    await page.getByTestId(`army-${land}`).press("Enter");
    const close = page.getByRole("button", { name: "Close action panel" });
    if (await close.isVisible()) await close.click();
    await page
      .getByRole("button", { name: "Center selected location" })
      .click();
    await expect(
      page.getByTestId(`army-${land}`).locator(".army-miniature-art > image"),
    ).toHaveCount(1);
    const before = await page
      .locator(selector)
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
    await page.locator(".world-map").evaluate(async (node) => {
      const r = node.getBoundingClientRect();
      for (let i = 0; i < 20; i++)
        node.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: -600,
            clientX: r.x + r.width / 2,
            clientY: r.y + r.height / 2,
            cancelable: true,
          }),
        );
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    expect(
      await page
        .locator(selector)
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href"))),
    ).toEqual(before);
    const undersized = await page
      .locator(selector)
      .evaluateAll(async (nodes) => {
        const failures: string[] = [];
        for (const node of nodes as SVGImageElement[]) {
          const matrix = node.getScreenCTM()!;
          const scale = Math.hypot(matrix.a, matrix.b) * devicePixelRatio;
          const image = new Image();
          image.src = node.getAttribute("href")!;
          await image.decode();
          if (
            image.naturalWidth + 1 < node.width.baseVal.value * scale ||
            image.naturalHeight + 1 < node.height.baseVal.value * scale
          )
            failures.push(image.src);
        }
        return failures;
      });
    expect(undersized).toEqual([]);
    await page.screenshot({
      path: `test-artifacts/sprite-max-zoom-${test.info().project.name}.png`,
    });
  });
});
