import { useLayoutEffect, type RefObject } from "react";
import type { CameraPaint } from "./useMapCamera";
import { prepareTerrainSources } from "./terrain-sources";
import {
  prepareMapGpu,
  type MapGpuDrawing,
  type TerrainSources,
} from "./map-gpu";

/** Keep the original map visible throughout preparation or failure. The GPU
 * canvas lives outside the transformed SVG layer and follows every camera frame,
 * so long drags cannot uncover a blank edge of a cached viewport. */
export function useTerrainGpu(
  svgRef: RefObject<SVGSVGElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  terrainPaint: RefObject<CameraPaint>,
  enabled: boolean,
  scale: number,
) {
  useLayoutEffect(() => {
    const root = svgRef.current,
      canvas = canvasRef.current;
    if (!root || !canvas || !enabled) return;
    const frame = canvas.parentElement!;
    let active = true,
      generation = 0,
      scheduled = 0,
      running = false;
    let controller: AbortController | undefined;
    let drawing: MapGpuDrawing | undefined,
      retainedSources: TerrainSources | undefined;
    let ready = false;
    let width = frame.clientWidth,
      height = frame.clientHeight;
    const fallback = (release = true) => {
      ready = false;
      canvas.dataset.terrainStatus = release ? "fallback" : "waiting";
      root.style.display = "";
      canvas.style.display = "none";
      delete canvas.dataset.textureBytes;
      if (release) {
        drawing?.dispose();
        drawing = undefined;
        retainedSources?.dispose();
        retainedSources = undefined;
      }
    };
    const paint = () => {
      if (!ready || !drawing || !width || !height) return;
      try {
        drawing.draw(
          terrainPaint.current.view,
          width,
          height,
          window.devicePixelRatio || 1,
        );
      } catch {
        fallback();
      }
    };
    terrainPaint.current.draw = paint;
    const prepare = async () => {
      scheduled = 0;
      if (
        !active ||
        running ||
        ![...root.querySelectorAll(".production-token-art")].every((node) =>
          node.querySelector(":scope > image"),
        )
      )
        return;
      const version = generation;
      controller = new AbortController();
      const signal = controller.signal;
      running = true;
      canvas.dataset.terrainStatus = "preparing";
      let sources: TerrainSources | undefined, next: MapGpuDrawing | undefined;
      try {
        sources = await prepareTerrainSources(root, scale, signal);
        signal.throwIfAborted();
        if (drawing && (await drawing.update(sources, signal))) {
          next = drawing;
        } else {
          drawing?.dispose();
          drawing = undefined;
          next = await prepareMapGpu(canvas, sources, signal);
        }
        signal.throwIfAborted();
        if (!active || version !== generation) return;
        drawing = next;
        next = undefined;
        retainedSources?.dispose();
        retainedSources = sources;
        sources = undefined;
        ready = true;
        paint();
        if (drawing) {
          root.style.display = "none";
          canvas.style.display = "block";
          canvas.dataset.terrainStatus = "ready";
          delete canvas.dataset.terrainError;
          canvas.dataset.textureBytes = String(drawing.bytes);
        }
      } catch (error) {
        if (active && !signal.aborted)
          canvas.dataset.terrainError = String(error);
        // An interrupted upload may have changed only part of the texture set.
        // Release it before the next preparation, even if a newer scene waits.
        if (active) fallback();
      } finally {
        next?.dispose();
        sources?.dispose();
        running = false;
        if (active && version !== generation && !scheduled)
          scheduled = window.setTimeout(() => void prepare(), 120);
      }
    };
    const invalidate = () => {
      generation++;
      controller?.abort();
      fallback(false);
      clearTimeout(scheduled);
      scheduled = running ? 0 : window.setTimeout(() => void prepare(), 120);
    };
    const mutations = new MutationObserver((records) => {
      // Culling styles and ocean bounds belong to the camera, not the artwork.
      const artwork = records.some(
        (record) =>
          record.type === "childList" ||
          (record.target !== root &&
            !(
              record.target instanceof SVGRectElement &&
              record.target.parentNode === root
            )),
      );
      if (artwork) invalidate();
    });
    mutations.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "href",
        "fill",
        "stroke",
        "stroke-width",
        "opacity",
        "transform",
        "points",
        "d",
        "clip-path",
        "data-terrain-key",
        "x",
        "y",
        "width",
        "height",
        "offset",
        "stop-color",
        "stop-opacity",
      ],
    });
    const resize = new ResizeObserver(() => {
      width = frame.clientWidth;
      height = frame.clientHeight;
      paint();
    });
    const lost = (event: Event) => {
      event.preventDefault();
      generation++;
      controller?.abort();
      fallback();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", invalidate);
    resize.observe(frame);
    invalidate();
    return () => {
      active = false;
      generation++;
      controller?.abort();
      clearTimeout(scheduled);
      mutations.disconnect();
      resize.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", invalidate);
      if (terrainPaint.current.draw === paint) delete terrainPaint.current.draw;
      fallback();
      canvas.width = canvas.height = 1;
    };
  }, [svgRef, canvasRef, terrainPaint, enabled, scale]);
}
