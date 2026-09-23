import { writeFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { generateWorld } from "../src/game/world";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { deserialize, serialize } from "../src/game/save";
import { syncSeasonSurfaces } from "../src/game/seasons";

let campaign: string;
function fixture() {
  if (campaign) return campaign;
  let game = newGame("large-terrain-renderer");
  Object.assign(game, generateWorld(game.seed, 850));
  game.calendar = { ...game.calendar!, startSeason: "spring" };
  syncSeasonSurfaces(game);
  while (game.phase.startsWith("setup")) game = run(game, chooseAIAction(game));
  game.phase = "economy";
  campaign = serialize(game);
  return campaign;
}
async function load(page: Page, data = fixture()) {
  await page.addInitScript(() => localStorage.setItem("catane-language", "en"));
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles({
    name: "large-renderer.json",
    mimeType: "application/json",
    buffer: Buffer.from(data),
  });
  await expect(page.locator(".world-map")).toBeVisible();
}
async function ready(page: Page) {
  await expect(page.locator(".terrain-canvas")).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".terrain-map")).toBeHidden();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".production-token-art")].every((node) =>
      node.querySelector(":scope > image"),
    ),
  );
}

// Compare with the original vector renderer, using its exact source artwork.
// The reference runs independently of the optimized terrain compiler/cache.
async function compareTerrain(page: Page, smoothOverview = false) {
  return page.evaluate(async (smoothOverview) => {
    const source =
      document.querySelector<HTMLCanvasElement>(".terrain-canvas")!;
    const actual = document.createElement("canvas");
    const frame = source.parentElement!;
    actual.width = Math.round(frame.clientWidth * devicePixelRatio);
    actual.height = Math.round(frame.clientHeight * devicePixelRatio);
    const offset = new DOMMatrix(getComputedStyle(source).transform);
    actual
      .getContext("2d")!
      .drawImage(
        source,
        (-parseFloat(source.style.left || "0") - offset.e) * devicePixelRatio,
        (-parseFloat(source.style.top || "0") - offset.f) * devicePixelRatio,
        actual.width,
        actual.height,
        0,
        0,
        actual.width,
        actual.height,
      );
    const root = document.querySelector<SVGSVGElement>(".terrain-map")!;
    const clone = root.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute("style");
    clone.setAttribute("width", String(actual.width));
    clone.setAttribute("height", String(actual.height));
    const urls = new Map<string, Promise<string>>();
    await Promise.all(
      [...clone.querySelectorAll("image")].map(async (node) => {
        const url = node.getAttribute("href")!;
        let prepared = urls.get(url);
        if (!prepared) {
          prepared = (async () => {
            const image = new Image();
            image.src = url;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            canvas.getContext("2d")!.drawImage(image, 0, 0);
            return canvas.toDataURL();
          })();
          urls.set(url, prepared);
        }
        node.setAttribute("href", await prepared);
      }),
    );
    const image = new Image();
    image.src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(new XMLSerializer().serializeToString(clone));
    await image.decode();
    const reference = document.createElement("canvas");
    reference.width = actual.width;
    reference.height = actual.height;
    const context = reference.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(image, 0, 0);
    // Firefox's offscreen SVG rasterizer aliases very small embedded images.
    // At overview scale compare 4px area averages, avoiding a test of those
    // different minification kernels. Close-up glyph/edge checks use full pixels.
    const overview = smoothOverview && root.viewBox.baseVal.width >= 300;
    const pixels = (canvas: HTMLCanvasElement) => {
      const data = canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height).data;
      if (!overview) return data;
      // Use an explicit area average: Firefox does not implement the canvas
      // imageSmoothingQuality hint for this reduction either.
      const averaged = new Float32Array(
        Math.ceil(canvas.width / 4) * Math.ceil(canvas.height / 4) * 4,
      );
      let at = 0;
      for (let y = 0; y < canvas.height; y += 4)
        for (let x = 0; x < canvas.width; x += 4) {
          let r = 0,
            g = 0,
            b = 0,
            alpha = 0,
            count = 0;
          for (let dy = y; dy < Math.min(canvas.height, y + 4); dy++)
            for (let dx = x; dx < Math.min(canvas.width, x + 4); dx++) {
              const i = (dy * canvas.width + dx) * 4,
                a = data[i + 3];
              r += data[i] * a;
              g += data[i + 1] * a;
              b += data[i + 2] * a;
              alpha += a;
              count++;
            }
          averaged[at++] = alpha ? r / alpha : 0;
          averaged[at++] = alpha ? g / alpha : 0;
          averaged[at++] = alpha ? b / alpha : 0;
          averaged[at++] = alpha / count;
        }
      return averaged;
    };
    const expected = pixels(reference),
      observed = pixels(actual);
    let error = 0,
      bad = 0,
      opaque = 0;
    for (let i = 0; i < observed.length; i += 4) {
      let maximum = Math.abs(observed[i + 3] - expected[i + 3]);
      for (let c = 0; c < 3; c++) {
        const difference = Math.abs(
          (observed[i + c] * observed[i + 3]) / 255 -
            (expected[i + c] * expected[i + 3]) / 255,
        );
        maximum = Math.max(maximum, difference);
        error += difference;
      }
      if (maximum > 40) bad++;
      if (expected[i + 3] > 240) opaque++;
    }
    Object.assign(window, {
      comparisonImages: {
        reference: reference.toDataURL(),
        actual: actual.toDataURL(),
      },
    });
    return {
      mean: error / ((observed.length / 4) * 3),
      badFraction: bad / (observed.length / 4),
      opaque,
    };
  }, smoothOverview);
}

for (const dpr of [1, 2])
  test(`large terrain matches SVG, moves and updates at DPR ${dpr}`, async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240000);
    // The project viewport can be mobile; use a second context for an explicit DPR.
    const context = await page
      .context()
      .browser()!
      .newContext({
        viewport: { width: 1100, height: 800 },
        deviceScaleFactor: dpr,
      });
    const isolated = await context.newPage();
    const errors: string[] = [];
    isolated.on("pageerror", (e) => errors.push(e.message));
    try {
      // An absolute URL is needed because the second context has no baseURL.
      const goto = isolated.goto.bind(isolated);
      isolated.goto = (url, options) =>
        goto(new URL(url, test.info().project.use.baseURL).href, options);
      await isolated.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (
          this: HTMLCanvasElement,
          ...args: Parameters<typeof get>
        ) {
          if (args[0] === "webgl2")
            args[1] = { ...args[1], preserveDrawingBuffer: true };
          return get.apply(this, args);
        } as typeof get;
      });
      await load(isolated);
      await ready(isolated);
      const compare = async () => {
        const difference = await compareTerrain(
          isolated,
          browserName === "firefox",
        );
        if (difference.mean >= 3) {
          const images = await isolated.evaluate(
            () =>
              (
                window as unknown as {
                  comparisonImages: Record<string, string>;
                }
              ).comparisonImages,
          );
          for (const [name, url] of Object.entries(images))
            writeFileSync(
              test.info().outputPath(`${name}.png`),
              Buffer.from(url.split(",")[1], "base64"),
            );
        }
        expect(difference.opaque).toBeGreaterThan(10000);
        // Different minification filters may change fine artwork at overview
        // scale. At maximum zoom the original glyphs and edges must match much
        // more closely. Large disagreements catch missing or misplaced tiles.
        const view = await isolated
          .locator(".world-map")
          .getAttribute("viewBox");
        const close = Number(view!.split(" ")[2]) < 300;
        expect(difference.mean).toBeLessThan(close ? 3 : 5);
        expect(difference.badFraction).toBeLessThan(close ? 0.005 : 0.02);
      };
      await compare();
      for (let i = 0; i < 20; i++)
        await isolated
          .getByRole("button", { name: "Zoom in", exact: true })
          .click();
      await compare();
      const frame = (await isolated.locator(".board-frame").boundingBox())!;
      for (const direction of [1, -1]) {
        await isolated.mouse.move(
          frame.x + frame.width * 0.5,
          frame.y + frame.height * 0.5,
        );
        await isolated.mouse.down();
        for (let i = 1; i <= 20; i++)
          await isolated.mouse.move(
            frame.x + frame.width * 0.5 + direction * i * 15,
            frame.y + frame.height * 0.5 + i * 3,
          );
        await isolated.mouse.up();
        await compare();
      }
      await isolated
        .getByRole("button", { name: "Fit entire map", exact: true })
        .click();
      await isolated
        .getByRole("button", { name: "Hide dice numbers", exact: true })
        .click();
      await ready(isolated);
      await compare();
      await isolated
        .getByRole("button", { name: "Show climates", exact: true })
        .click();
      await expect(isolated.locator(".terrain-canvas")).toBeHidden();
      await expect(isolated.locator(".climate-map-tile")).toHaveCount(850);
      await isolated
        .getByRole("button", { name: "Show climates", exact: true })
        .click();
      await ready(isolated);
      await compare();
      await isolated.getByRole("button", { name: /Spring Year 1/ }).click();
      await isolated.getByRole("button", { name: /Winter PREVIEW/ }).click();
      await ready(isolated);
      await compare();
      await isolated.getByTestId("hex-0,0").press("Enter");
      await expect(
        isolated.getByRole("complementary", { name: "Action inspector" }),
      ).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });

for (const failure of ["context", "image", "stalled image", "texture limit"])
  test(`large terrain keeps working when ${failure} preparation fails`, async ({
    page,
  }) => {
    await page.addInitScript((failure) => {
      if (failure === "context") {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (
          this: HTMLCanvasElement,
          ...args: Parameters<typeof original>
        ) {
          if (this.classList.contains("terrain-canvas")) return null;
          return original.apply(this, args);
        } as typeof original;
      } else if (failure === "texture limit") {
        const original = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function (parameter) {
          // Reject the allocation before uploading to an unsupported device.
          // The unchanged SVG must still be visible and interactive.
          return parameter === this.MAX_TEXTURE_SIZE
            ? 16
            : original.call(this, parameter);
        };
      } else {
        const original = HTMLImageElement.prototype.decode;
        HTMLImageElement.prototype.decode = function () {
          if (this.src.includes("/assets/seasons/"))
            return failure === "stalled image"
              ? new Promise<void>(() => {})
              : Promise.reject(Error("Unavailable terrain decoder"));
          return original.call(this);
        };
      }
    }, failure);
    await load(page);
    await expect(page.locator(".terrain-canvas")).toHaveAttribute(
      "data-terrain-status",
      "fallback",
      { timeout: 30000 },
    );
    await expect(page.locator(".terrain-map")).toBeVisible();
    await expect(page.locator(".terrain-canvas")).toBeHidden();
    await page.getByTestId("hex-0,0").press("Enter");
    await expect(
      page.getByRole("complementary", { name: "Action inspector" }),
    ).toBeVisible();
  });

test("GPU resources are reused across camera input and released on context loss and mode changes", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    const seen = new WeakSet<WebGL2RenderingContext>();
    const live = new Set<WebGLTexture>();
    const stats = { allocations: 0, uploads: 0 };
    let current: WebGL2RenderingContext;
    let contextLoss: WEBGL_lose_context;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof get>
    ) {
      const context = get.apply(this, args);
      if (
        args[0] === "webgl2" &&
        this.classList.contains("terrain-canvas") &&
        context
      ) {
        current = context as WebGL2RenderingContext;
        if (!seen.has(current)) {
          seen.add(current);
          contextLoss = current.getExtension("WEBGL_lose_context")!;
          const create = current.createTexture.bind(current),
            remove = current.deleteTexture.bind(current),
            upload = current.texSubImage3D.bind(current);
          current.createTexture = () => {
            const texture = create();
            if (texture) {
              live.add(texture);
              stats.allocations++;
            }
            return texture;
          };
          current.deleteTexture = (texture) => {
            if (texture) live.delete(texture);
            remove(texture);
          };
          current.texSubImage3D = ((...args: Parameters<typeof upload>) => {
            stats.uploads++;
            upload(...args);
          }) as typeof upload;
        }
      }
      return context;
    } as typeof get;
    Object.assign(window, {
      terrainTest: {
        stats: () => ({ ...stats, live: live.size }),
        lose: () => contextLoss.loseContext(),
        restore: () => contextLoss.restoreContext(),
      },
    });
  });
  const playing = deserialize(fixture());
  playing.phase = "roll";
  await load(page, serialize(playing));
  await ready(page);
  await page.getByRole("button", { name: "Roll dice", exact: true }).click();
  await expect(
    page.locator(".production-token.producing").first(),
  ).toBeAttached();
  await ready(page);
  type Probe = {
    stats(): { allocations: number; uploads: number; live: number };
    lose(): void;
    restore(): void;
  };
  const stats = () =>
    page.evaluate(() =>
      (window as unknown as { terrainTest: Probe }).terrainTest.stats(),
    );
  const initial = await stats();
  expect(initial.live).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.setViewportSize({ width: 1200, height: 820 });
  await ready(page);
  // The raster scale can change on resize; wait for that one-time preparation.
  const resized = await stats();
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await page
    .getByRole("button", { name: "Fit entire map", exact: true })
    .click();
  expect(await stats()).toEqual(resized);
  await page
    .getByRole("button", { name: "Hide dice numbers", exact: true })
    .click();
  await ready(page);
  // New badge backgrounds replace obsolete layers, not the terrain textures.
  const hidden = await stats();
  expect(hidden.allocations).toBe(resized.allocations);
  expect(hidden.uploads - resized.uploads).toBeLessThan(resized.uploads / 2);
  await page.evaluate(() =>
    (window as unknown as { terrainTest: Probe }).terrainTest.lose(),
  );
  await expect(page.locator(".terrain-map")).toBeVisible();
  expect((await stats()).live).toBe(0);
  await page.getByTestId("hex-0,0").press("Enter");
  await expect(
    page.getByRole("complementary", { name: "Action inspector" }),
  ).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { terrainTest: Probe }).terrainTest.restore(),
  );
  await ready(page);
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "Show climates", exact: true })
      .click();
    await expect(page.locator(".terrain-canvas")).toBeHidden();
    expect((await stats()).live).toBe(0);
    await page
      .getByRole("button", { name: "Show climates", exact: true })
      .click();
    await ready(page);
    expect((await stats()).live).toBeLessThanOrEqual(16);
  }
  expect(errors).toEqual([]);
});
