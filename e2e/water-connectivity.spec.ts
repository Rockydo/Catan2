import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { generateWorld } from "../src/game/world";
import { syncSeasonSurfaces } from "../src/game/seasons";
import { syncEnvironment } from "../src/game/environment";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { serialize, assertInvariants } from "../src/game/save";
import { landform } from "../src/game/geography";

function fixture(size: number) {
  let index = 0;
  while (landform(`connected-water-${index}`) !== "inland-seas") index++;
  let s = newGame(`connected-water-${index}`);
  Object.assign(s, generateWorld(s.seed, size, true));
  s.wildlife = [];
  s.environmentRound = undefined;
  s.calendar = { ...s.calendar!, startSeason: "summer" };
  syncSeasonSurfaces(s);
  syncEnvironment(s);
  // Explicit occupants exercise both clips independently of procedural abundance.
  const river = Object.values(s.tiles).find(
    (t) => t.geography?.waterway === "river",
  )!;
  const sea = Object.values(s.tiles).find(
    (t) =>
      t.resource === "water" &&
      ["coastal", "deep", "shoal"].includes(t.geography?.waterway ?? ""),
  )!;
  s.wildlife!.push(
    {
      id: "fixture-river-fish",
      kind: "fish",
      tile: river.id,
      lastRound: s.round,
    },
    {
      id: "fixture-sea-whale",
      kind: "whale",
      tile: sea.id,
      lastRound: s.round,
    },
  );
  syncEnvironment(s);
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  s.phase = "economy";
  assertInvariants(s);
  return s;
}
for (const size of [300, 850]) {
  test(`connected water and wildlife render on ${size} tiles`, async ({
    page,
  }) => {
    const s = fixture(size),
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("/assets/") && r.status() >= 400)
        errors.push(r.url());
    });
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.addInitScript(() =>
      localStorage.setItem("catane-language", "en"),
    );
    await page.goto("/");
    await page.locator('input[type="file"]').setInputFiles({
      name: "water-test.json",
      mimeType: "application/json",
      buffer: Buffer.from(serialize(s)),
    });
    await expect(page.locator(".world-map")).toBeVisible();
    await expect(page.locator(".connected-water").first()).toBeAttached();
    await expect(page.locator(".wildlife-art").first()).toBeAttached();
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll<SVGImageElement>(
          ".connected-water image, .wildlife-art image",
        ),
      ].every((e) => !!e.href.baseVal),
    );
    if (size >= 800) {
      await expect(page.locator(".terrain-canvas")).toHaveAttribute(
        "data-terrain-status",
        "ready",
        { timeout: 30000 },
      );
      await expect(page.locator(".terrain-map")).toBeHidden();
    }
    const decoded = await page
      .locator(".connected-water image, .wildlife-art image")
      .evaluateAll(async (nodes) => {
        const urls = [...new Set(nodes.map((n) => n.getAttribute("href")!))];
        await Promise.all(
          urls.map(async (url) => {
            const im = new Image();
            im.src = url;
            await im.decode();
          }),
        );
        return urls.length;
      });
    expect(decoded).toBeGreaterThan(3);
    const clips = await page
      .locator(".connected-water")
      .evaluateAll((nodes) => {
        const result = { rivers: 0, seas: 0, errors: [] as string[] };
        for (const water of nodes) {
          const river = water.getAttribute("data-channel-mask");
          const expected =
            river !== null
              ? `url(#water-river-${river}${Number(water.getAttribute("data-basin-mask")) ? `-${water.getAttribute("data-basin-mask")}` : ""})`
              : `url(#water-surface-${water.getAttribute("data-shore-mask")})`;
          for (const animal of water.parentElement!.querySelectorAll(
            ".wildlife-art image",
          )) {
            result[river !== null ? "rivers" : "seas"]++;
            if (animal.getAttribute("clip-path") !== expected)
              result.errors.push(animal.outerHTML);
          }
        }
        return result;
      });
    expect(clips.rivers).toBeGreaterThan(0);
    expect(clips.seas).toBeGreaterThan(0);
    expect(clips.errors).toEqual([]);

    await page.screenshot({
      path: `test-artifacts/connected-water-${size}-${test.info().project.name}.png`,
    });
    const frame = page.locator(".world-map");
    const box = (await frame.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
    await page.mouse.wheel(0, -450);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.58, {
      steps: 12,
    });
    await page.mouse.up();
    await page.screenshot({
      path: `test-artifacts/connected-water-detail-${size}-${test.info().project.name}.png`,
    });
    if (size >= 800)
      await expect(page.locator(".terrain-canvas")).toHaveAttribute(
        "data-terrain-status",
        "ready",
      );
    await page.locator(".map-view-select").selectOption("wildlife");
    await expect(page.locator(".wildlife-art").first()).toBeVisible();
    await page.locator(".map-view-select").selectOption("normal");
    if (size >= 800)
      await expect(page.locator(".terrain-canvas")).toHaveAttribute(
        "data-terrain-status",
        "ready",
        { timeout: 30000 },
      );
    expect(errors).toEqual([]);
  });
}

test("marine artwork cannot paint dry pixels in any river or coastline shape", async ({
  page,
}) => {
  const cases: {
    river: boolean;
    mask: number;
    basin: number;
    path: string;
    svg: string;
  }[] = JSON.parse(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/water-clip-fixtures.ts"],
      { encoding: "utf8" },
    ),
  );
  await page.goto("/");
  const failures = await page.evaluate(async (cases) => {
    const assets = new Map<string, string>();
    for (const kind of ["fish", "whale"]) {
      const url = `./assets/geography/wildlife-${kind}.webp`,
        blob = await (await fetch(url)).blob();
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
      assets.set(url, data);
    }
    const failures = [];
    for (const fixture of cases) {
      let source = fixture.svg;
      for (const [url, data] of assets) source = source.replaceAll(url, data);
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 368;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, 368, 368).data,
        wet = new Path2D(fixture.path);
      if (
        fixture.river &&
        fixture.mask &&
        !(fixture.mask & (fixture.mask - 1))
      ) {
        let footprint = 0;
        for (let y = -44; y <= 44; y++)
          for (let x = -44; x <= 44; x++)
            if (ctx.isPointInPath(wet, x, y)) footprint++;
        if (footprint < 2500 || !ctx.isPointInPath(wet, 0, 0))
          failures.push({
            river: true,
            mask: fixture.mask,
            painted: footprint,
            dry: -1,
          });
      }
      let painted = 0,
        dry = 0;
      ctx.lineWidth = 0.6;
      for (let y = 0; y < 368; y++)
        for (let x = 0; x < 368; x++) {
          if (pixels[(y * 368 + x) * 4 + 3] <= 10) continue;
          painted++;
          const px = (x + 0.5) / 4 - 46,
            py = (y + 0.5) / 4 - 46;
          if (
            !ctx.isPointInPath(wet, px, py) &&
            !ctx.isPointInStroke(wet, px, py)
          )
            dry++;
        }
      if (!painted || dry)
        failures.push({
          river: fixture.river,
          mask: fixture.mask,
          painted,
          dry,
        });
    }
    return failures;
  }, cases);
  expect(failures).toEqual([]);
});
