import { minValue, maxValue } from "../game/aggregate";
import { retainedCache } from "./retained-cache";
import type { MapSpriteSource, TerrainSources } from "./map-gpu";

type Paint = (context: CanvasRenderingContext2D) => void;
const MARGIN = 46;
const oceanPatterns = retainedCache<HTMLCanvasElement>(2, (canvas) => {
  canvas.width = canvas.height = 1;
});
const loadedImages = retainedCache<Promise<HTMLImageElement>>(8);
const terrainBases = retainedCache<HTMLCanvasElement>(2, (canvas) => {
  canvas.width = canvas.height = 1;
});

/** Compile the existing decorative SVG after its sprites have been prepared.
 * No gameplay or hit targets are reconstructed here. Camera draws inspect only
 * the view rectangle; tile geometry and artwork are read once per scene. */
export async function prepareTerrainSources(
  root: SVGSVGElement,
  scale: number,
  signal: AbortSignal,
): Promise<TerrainSources> {
  const releases: (() => void)[] = [];
  let released = false;
  const dispose = () => {
    if (released) return;
    released = true;
    for (const release of releases) release();
  };
  try {
    function worldTransform(node: SVGGraphicsElement) {
      const chain: SVGGraphicsElement[] = [];
      for (
        let current: Element | null = node;
        current && current !== root;
        current = current.parentElement
      )
        chain.unshift(current as SVGGraphicsElement);
      let matrix = new DOMMatrix();
      for (const element of chain) {
        const list = element.transform?.baseVal;
        for (let i = 0; list && i < list.numberOfItems; i++)
          matrix = matrix.multiply(list.getItem(i).matrix);
      }
      return matrix;
    }
    const images = new Map<string, Promise<HTMLImageElement>>();
    const readImage = (url: string) => {
      let result = images.get(url);
      if (!result) {
        const lease = loadedImages.retain(url, () =>
          (async () => {
            const image = new Image();
            image.src = url;
            let timeout: ReturnType<typeof setTimeout> | undefined;
            try {
              await Promise.race([
                image.decode(),
                new Promise<never>((_, reject) => {
                  timeout = setTimeout(
                    () => reject(Error("Terrain image timed out")),
                    10000,
                  );
                }),
              ]);
            } finally {
              clearTimeout(timeout);
            }
            return image;
          })(),
        )!;
        releases.push(lease.release);
        result = new Promise<HTMLImageElement>((resolve, reject) => {
          const abort = () => reject(signal.reason);
          signal.addEventListener("abort", abort, { once: true });
          lease.value
            .then(resolve, reject)
            .finally(() => signal.removeEventListener("abort", abort));
          if (signal.aborted) abort();
        });
        images.set(url, result);
      }
      return result;
    };
    const number = (node: Element, key: string, fallback = 0) =>
      Number(node.getAttribute(key) ?? fallback);
    const color = (node: Element, key: string, fallback: string) =>
      node.getAttribute(key) ?? fallback;
    function path(node: SVGGraphicsElement) {
      switch (node.tagName.toLowerCase()) {
        case "polygon":
          return new Path2D(
            `M${node.getAttribute("points")!.trim().replace(/\s+/g, "L")}Z`,
          );
        case "path":
          return new Path2D(node.getAttribute("d")!);
        case "rect": {
          if (number(node, "rx") || number(node, "ry"))
            throw Error("Unprepared rounded rectangle");
          const result = new Path2D();
          result.rect(
            number(node, "x"),
            number(node, "y"),
            number(node, "width"),
            number(node, "height"),
          );
          return result;
        }
        default:
          throw Error(`Unprepared terrain shape: ${node.tagName}`);
      }
    }
    function fill(
      node: SVGGraphicsElement,
      value: string,
    ): (context: CanvasRenderingContext2D) => string | CanvasGradient {
      if (!value.startsWith("url(")) return () => value;
      const match = /^url\(#([^)]*)\)$/.exec(value);
      const definition = match && root.querySelector(`[id="${match[1]}"]`);
      if (
        !definition ||
        definition.tagName !== "linearGradient" ||
        definition.hasAttribute("gradientUnits") ||
        definition.hasAttribute("gradientTransform")
      )
        throw Error("Unsupported terrain fill");
      if (node.tagName !== "polygon")
        throw Error("Unsupported gradient geometry");
      const coordinates = node
        .getAttribute("points")!
        .trim()
        .split(/[ ,]+/)
        .map(Number);
      const xs = coordinates.filter((_, i) => i % 2 === 0),
        ys = coordinates.filter((_, i) => i % 2 === 1);
      const box = {
        x: minValue(xs),
        y: minValue(ys),
        width: maxValue(xs) - minValue(xs),
        height: maxValue(ys) - minValue(ys),
      };
      const stops = [...definition.children].map((stop) => {
        if (stop.tagName !== "stop" || stop.hasAttribute("style"))
          throw Error("Unsupported gradient stop");
        let tint = color(stop, "stop-color", "#000000");
        const opacity = number(stop, "stop-opacity", 1);
        if (opacity !== 1) {
          if (!/^#[a-f\d]{6}$/i.test(tint))
            throw Error("Unsupported translucent gradient");
          tint = `rgba(${parseInt(tint.slice(1, 3), 16)},${parseInt(tint.slice(3, 5), 16)},${parseInt(tint.slice(5, 7), 16)},${opacity})`;
        }
        return { offset: number(stop, "offset"), tint };
      });
      const x1 = box.x + number(definition, "x1") * box.width,
        y1 = box.y + number(definition, "y1") * box.height;
      const x2 = box.x + number(definition, "x2", 1) * box.width,
        y2 = box.y + number(definition, "y2") * box.height;
      return (context) => {
        const gradient = context.createLinearGradient(x1, y1, x2, y2);
        for (const stop of stops) gradient.addColorStop(stop.offset, stop.tint);
        return gradient;
      };
    }
    async function compile(
      node: SVGGraphicsElement,
    ): Promise<Paint | MapSpriteSource> {
      signal.throwIfAborted();
      const matrix = worldTransform(node);
      let alpha = 1;
      for (
        let parent: Element | null = node;
        parent && parent !== root;
        parent = parent.parentElement
      ) {
        alpha *= number(parent, "opacity", 1);
        const filter =
          parent.getAttribute("filter") ?? (parent as SVGElement).style?.filter;
        if (filter && filter !== "none")
          throw Error("Unprepared terrain filter");
      }
      let paint: Paint;
      if (node.tagName === "image") {
        const source = node.getAttribute("href");
        if (!source) throw Error("Missing terrain image");
        const loaded = readImage(source);
        const x = number(node, "x"),
          y = number(node, "y"),
          width = number(node, "width"),
          height = number(node, "height");
        const clipId = node.getAttribute("clip-path");
        if (clipId && clipId !== "url(#season-terrain-hex)")
          throw Error("Unsupported terrain clip");
        const clip = clipId
          ? path(
              root.querySelector<SVGGraphicsElement>(
                "#season-terrain-hex > polygon",
              )!,
            )
          : undefined;
        const preserve =
          node.getAttribute("preserveAspectRatio") ?? "xMidYMid meet";
        if (preserve !== "xMidYMid slice" && preserve !== "xMidYMid meet")
          throw Error("Unsupported image aspect ratio");
        const image = await loaded;
        // Current images are square or prepared at their exact viewport ratio.
        // Match SVG's aspect-ratio behavior when fractional raster bounds round.
        const ratio = preserve.endsWith("slice")
          ? Math.max(width / image.naturalWidth, height / image.naturalHeight)
          : Math.min(width / image.naturalWidth, height / image.naturalHeight);
        const w = image.naturalWidth * ratio,
          h = image.naturalHeight * ratio;
        if (
          !clip &&
          preserve === "xMidYMid meet" &&
          !matrix.b &&
          !matrix.c &&
          matrix.a > 0 &&
          matrix.d > 0
        ) {
          const left = matrix.a * (x + (width - w) / 2) + matrix.e;
          const top = matrix.d * (y + (height - h) / 2) + matrix.f;
          return {
            image,
            x: left,
            y: top,
            w: w * matrix.a,
            h: h * matrix.d,
            opacity: alpha,
          };
        }
        if (!clip && preserve !== "xMidYMid meet")
          throw Error("Unbounded image slice");
        paint = (context) => {
          if (clip) context.clip(clip);
          context.drawImage(
            image,
            x + (width - w) / 2,
            y + (height - h) / 2,
            w,
            h,
          );
        };
      } else {
        const geometry = path(node),
          style = color(node, "fill", "black"),
          stroke = color(node, "stroke", "none");
        const paintFill =
          style === "none" || style === "transparent"
            ? undefined
            : fill(node, style);
        const width = number(node, "stroke-width", 1);
        if (
          node.hasAttribute("stroke-dasharray") ||
          node.hasAttribute("fill-rule")
        )
          throw Error("Unsupported terrain stroke");
        paint = (context) => {
          if (paintFill) {
            context.fillStyle = paintFill(context);
            context.fill(geometry);
          }
          if (stroke !== "none" && stroke !== "transparent") {
            context.strokeStyle = stroke;
            context.lineWidth = width;
            context.stroke(geometry);
          }
        };
      }
      return (context) => {
        context.save();
        context.transform(
          matrix.a,
          matrix.b,
          matrix.c,
          matrix.d,
          matrix.e,
          matrix.f,
        );
        context.globalAlpha = alpha;
        paint(context);
        context.restore();
      };
    }
    const tiles = [
      ...root.querySelectorAll<SVGGElement>(":scope > g[data-map-x]"),
    ];
    signal.throwIfAborted();
    const results = await Promise.allSettled(
      tiles.map(async (tile) => {
        const key = tile.dataset.terrainKey;
        if (!key) throw Error("Missing terrain cache key");
        const backgrounds: Paint[] = [],
          tokens: MapSpriteSource[] = [];
        // Empty semantic groups and titles have no visual paint. All other leaves
        // must be supported or the complete layer falls back to its original SVG.
        for (const node of tile.querySelectorAll<SVGGraphicsElement>("*")) {
          if (["g", "title"].includes(node.tagName)) continue;
          if (!["polygon", "path", "rect", "image"].includes(node.tagName))
            throw Error("Unprepared terrain decoration");
          const paint = await compile(node);
          if (node.closest(".terrain-production")) {
            if (typeof paint === "function")
              throw Error("Unprepared production badge");
            tokens.push(paint);
          } else {
            if (typeof paint !== "function")
              throw Error("Unbounded terrain image");
            backgrounds.push(paint);
          }
        }
        return {
          key,
          x: number(tile, "data-map-x"),
          y: number(tile, "data-map-y"),
          backgrounds,
          tokens,
        };
      }),
    );
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    const drafts = results.map((result) => {
      if (result.status !== "fulfilled") throw Error("Missing terrain result");
      return result.value;
    });
    signal.throwIfAborted();
    const definitions = [
      ...root.querySelectorAll("linearGradient, #season-terrain-hex"),
    ]
      .map((node) => node.outerHTML)
      .join("");
    // Terrain art is 384px wide. Keep native detail without allocating larger
    // copies of the same pixels when display density or maximum zoom increases.
    // Production labels retain their independently prepared full resolution.
    const terrainScale = Math.min(scale, 384 / 86);
    const bases = new Map<string, HTMLCanvasElement>();
    const prepared = await Promise.allSettled(
      drafts.map(async (record) => {
        let base = bases.get(record.key);
        if (!base) {
          const lease = terrainBases.retain(
            `${record.key}@${terrainScale}/${definitions}`,
            () => {
              const base = document.createElement("canvas");
              base.width = base.height = Math.ceil(2 * MARGIN * terrainScale);
              const context = base.getContext("2d", {
                willReadFrequently: true,
              });
              if (!context) throw Error("Terrain canvas is unavailable");
              const ratio = base.width / (2 * MARGIN);
              context.setTransform(
                ratio,
                0,
                0,
                ratio,
                (MARGIN - record.x) * ratio,
                (MARGIN - record.y) * ratio,
              );
              for (const paint of record.backgrounds) paint(context);
              return base;
            },
          )!;
          releases.push(lease.release);
          base = lease.value;
          bases.set(record.key, base);
        }
        return {
          x: record.x,
          y: record.y,
          base,
          tokens: record.tokens,
        };
      }),
    );
    const failed = prepared.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    const records = prepared.map((result) => {
      if (result.status !== "fulfilled") throw Error("Missing terrain image");
      return result.value;
    });
    // The quiet ocean pattern follows world coordinates, as in the SVG source.
    const ocean = root.querySelector<SVGRectElement>(":scope > rect");
    const pattern = root.querySelector<SVGPatternElement>("#sea-lines");
    if (!ocean || !pattern) throw Error("Missing ocean pattern");
    const pw = number(pattern, "width"),
      ph = number(pattern, "height");
    const oceanLease = oceanPatterns.retain(
      `${pattern.outerHTML}@${scale}`,
      () => {
        const wave = document.createElement("canvas");

        wave.width = Math.ceil(pw * scale);
        wave.height = Math.ceil(ph * scale);
        const wc = wave.getContext("2d", { willReadFrequently: true });
        if (!wc) throw Error("Ocean canvas is unavailable");
        wc.scale(wave.width / pw, wave.height / ph);
        for (const node of pattern.children as unknown as SVGGraphicsElement[]) {
          if (node.tagName !== "path") throw Error("Unsupported ocean pattern");
          wc.globalAlpha = number(node, "opacity", 1);
          wc.strokeStyle = color(node, "stroke", "black");
          wc.lineWidth = number(node, "stroke-width", 1);
          wc.stroke(path(node));
        }
        return wave;
      },
    )!;
    releases.push(oceanLease.release);
    const wave = oceanLease.value;
    signal.throwIfAborted();
    const sprites: MapSpriteSource[] = [];
    for (const record of records) {
      sprites.push({
        image: record.base,
        x: record.x - MARGIN,
        y: record.y - MARGIN,
        w: 2 * MARGIN,
        h: 2 * MARGIN,
        opacity: 1,
      });
      for (const token of record.tokens) sprites.push(token);
    }
    return { sprites, ocean: { image: wave, w: pw, h: ph }, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
