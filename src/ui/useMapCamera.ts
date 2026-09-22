import { useEffect, useLayoutEffect, useRef, type PointerEvent } from "react";
export interface MapBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Point = { x: number; y: number };

/** Composite motion; refresh crisp vectors promptly when input settles. */
export function useMapCamera(
  bounds: MapBounds,
  maxZoom: number,
  seed: string,
  sceneRevision: object,
) {
  const svg = useRef<SVGSVGElement>(null);
  const terrain = useRef<SVGSVGElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const ocean = useRef<SVGRectElement>(null);
  const hitArea = useRef<SVGRectElement>(null);
  const camera = useRef({ zoom: 1, x: 0, y: 0 });
  const settings = useRef({ bounds, maxZoom });
  settings.current = { bounds, maxZoom };
  const committed = useRef(bounds);
  const drawn = useRef<MapBounds | null>(null);
  const scene = useRef<
    Array<{ node: SVGElement; x: number; y: number; hidden: boolean }>
  >([]);
  // SVG overflow remains visible for panning. Hide distant scene groups instead
  // of asking the browser to lay out/rasterize the entire enlarged world.
  function viewport(v: MapBounds): MapBounds {
    const r = rect.current;
    if (!r || !r.width || !r.height) return v;
    const scale = Math.min(r.width / v.w, r.height / v.h);
    const w = r.width / scale,
      h = r.height / scale;
    return { x: v.x - (w - v.w) / 2, y: v.y - (h - v.h) / 2, w, h };
  }
  function cull(v: MapBounds) {
    const visible = viewport(v);
    // A quarter viewport on each side plus the largest miniature/label.
    // Refresh before a drag or zoom-out could expose anything hidden.
    const region = {
      x: visible.x - visible.w * 0.25 - 80,
      y: visible.y - visible.h * 0.25 - 80,
      w: visible.w * 1.5 + 160,
      h: visible.h * 1.5 + 160,
    };
    // The invisible input surface must not inflate the SVG paint bounds to
    // hundreds of screen widths when zoomed in.
    if (hitArea.current) {
      for (const [name, value] of Object.entries({
        x: visible.x - visible.w,
        y: visible.y - visible.h,
        width: visible.w * 3,
        height: visible.h * 3,
      })) {
        const text = String(value);
        if (hitArea.current.getAttribute(name) !== text)
          hitArea.current.setAttribute(name, text);
      }
    }
    let hidden = false;
    for (const entry of scene.current) {
      const outside =
        entry.x < region.x ||
        entry.x > region.x + region.w ||
        entry.y < region.y ||
        entry.y > region.y + region.h;
      hidden ||= outside;
      if (entry.hidden !== outside) {
        entry.node.style.display = outside ? "none" : "";
        entry.hidden = outside;
      }
    }
    // With every group drawn, panning needs no buffer refresh at all.
    drawn.current = hidden ? region : null;
  }
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = useRef(0),
    clearDrag = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rect = useRef<DOMRect | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    px: number;
    py: number;
    scale: number;
    moved: boolean;
  } | null>(null);
  function view() {
    const b = settings.current.bounds,
      c = camera.current;
    return {
      x: b.x + (b.w * (1 - 1 / c.zoom)) / 2 + c.x,
      y: b.y + (b.h * (1 - 1 / c.zoom)) / 2 + c.y,
      w: b.w / c.zoom,
      h: b.h / c.zoom,
    };
  }
  function commit() {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    clearTimeout(settle.current);
    const v = view();
    const box = `${v.x} ${v.y} ${v.w} ${v.h}`;
    for (const ref of [svg, terrain])
      if (ref.current?.getAttribute("viewBox") !== box)
        ref.current?.setAttribute("viewBox", box);
    cull(v);
    if (layer.current) layer.current.style.transform = "";
    committed.current = v;
    if (ocean.current) {
      ocean.current.setAttribute("x", String(v.x - v.w));
      ocean.current.setAttribute("y", String(v.y - v.h));
      ocean.current.setAttribute("width", String(v.w * 3));
      ocean.current.setAttribute("height", String(v.h * 3));
    }
  }
  function apply() {
    frame.current = 0;
    const v = view(),
      base = committed.current,
      r = rect.current;
    if (!svg.current || !r) {
      commit();
      return;
    }
    const visible = viewport(v),
      region = drawn.current;
    if (
      region &&
      (visible.x < region.x + 80 ||
        visible.y < region.y + 80 ||
        visible.x + visible.w > region.x + region.w - 80 ||
        visible.y + visible.h > region.y + region.h - 80)
    ) {
      commit();
      return;
    }
    const baseScale = Math.min(r.width / base.w, r.height / base.h),
      scale = base.w / v.w;
    const marginX = (r.width - base.w * baseScale) / 2,
      marginY = (r.height - base.h * baseScale) / 2;
    const x = marginX * (1 - scale) + (base.x - v.x) * baseScale * scale;
    const y = marginY * (1 - scale) + (base.y - v.y) * baseScale * scale;
    layer.current!.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }
  function schedule() {
    if (!frame.current) frame.current = requestAnimationFrame(apply);
    clearTimeout(settle.current);
    // Restore sharp vector labels within a few frames of the final notch.
    // Keep a short quiet window so a rapid wheel/trackpad gesture stays on the
    // compositor instead of repeatedly rasterizing terrain while it moves.
    settle.current = setTimeout(() => {
      if (!drag.current) commit();
    }, 80);
  }
  function setPan(next: Point) {
    camera.current.x = next.x;
    camera.current.y = next.y;
    schedule();
  }
  function setZoom(next: number | ((z: number) => number)) {
    camera.current.zoom = Math.max(
      0.6,
      Math.min(
        settings.current.maxZoom,
        typeof next === "function" ? next(camera.current.zoom) : next,
      ),
    );
    schedule();
  }
  // Index geometry once per React scene update, never by reading thousands of
  // DOM attributes during a camera refresh. Include new construction/reveals.
  useLayoutEffect(() => {
    scene.current = Array.from(
      layer.current?.querySelectorAll<SVGElement>("[data-map-x]") ?? [],
      (node) => ({
        node,
        x: Number(node.dataset.mapX),
        y: Number(node.dataset.mapY),
        hidden: node.style.display === "none",
      }),
    );
    cull(view());
  }, [sceneRevision]);
  useLayoutEffect(() => {
    commit();
  }, [bounds.x, bounds.y, bounds.w, bounds.h]);
  useLayoutEffect(() => {
    camera.current = { zoom: 1, x: 0, y: 0 };
    commit();
  }, [seed]);
  useEffect(() => {
    const element = svg.current!;
    const measure = () => {
      rect.current = layer.current!.parentElement!.getBoundingClientRect();
      cull(view());
    };
    measure();
    const resize = new ResizeObserver(measure);
    // Observe the fixed HTML viewport, not the SVG graphics bounding box:
    // changing the drawing must never trigger another camera refresh.
    resize.observe(layer.current!.parentElement!);
    function wheel(event: WheelEvent) {
      if (event.ctrlKey) return;
      event.preventDefault();
      const r = rect.current!,
        v = view(),
        current = camera.current;
      const scale = Math.min(r.width / v.w, r.height / v.h);
      if (!scale) return;
      const point = {
        x: v.x + (event.clientX - r.x - (r.width - v.w * scale) / 2) / scale,
        y: v.y + (event.clientY - r.y - (r.height - v.h * scale) / 2) / scale,
      };
      const next = Math.max(
        0.6,
        Math.min(
          settings.current.maxZoom,
          current.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12),
        ),
      );
      const b = settings.current.bounds,
        cx = b.x + b.w / 2,
        cy = b.y + b.h / 2,
        ratio = current.zoom / next;
      current.x = point.x + (cx + current.x - point.x) * ratio - cx;
      current.y = point.y + (cy + current.y - point.y) * ratio - cy;
      current.zoom = next;
      schedule();
    }
    element.addEventListener("wheel", wheel, { passive: false });
    // Layout offsets may change when a surrounding drawer or page scrolls.
    window.addEventListener("scroll", measure, true);
    return () => {
      resize.disconnect();
      element.removeEventListener("wheel", wheel);
      window.removeEventListener("scroll", measure, true);
      cancelAnimationFrame(frame.current);
      clearTimeout(clearDrag.current);
      clearTimeout(settle.current);
    };
  }, []);
  function pointerDown(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    clearTimeout(clearDrag.current);
    rect.current = layer.current!.parentElement!.getBoundingClientRect();
    const v = view(),
      r = rect.current;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      px: camera.current.x,
      py: camera.current.y,
      scale: Math.min(r.width / v.w, r.height / v.h),
      moved: false,
    };
  }
  function pointerMove(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d || e.buttons !== 1 || !d.scale) return;
    const dx = e.clientX - d.x,
      dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 5 && !d.moved) {
      d.moved = true;
      if (e.isTrusted) svg.current?.setPointerCapture(e.pointerId);
    }
    if (d.moved) setPan({ x: d.px - dx / d.scale, y: d.py - dy / d.scale });
  }
  function pointerUp(e: PointerEvent<SVGSVGElement>) {
    // A click should not synchronously force a zoom rasterization before its
    // game action. Finish actual drags; let other input settle asynchronously.
    if (drag.current?.moved) commit();
    else if (layer.current?.style.transform) schedule();
    if (svg.current?.hasPointerCapture(e.pointerId))
      svg.current.releasePointerCapture(e.pointerId);
    clearDrag.current = setTimeout(() => {
      drag.current = null;
    }, 20);
  }
  function clicked(action: () => void) {
    if (!drag.current?.moved) action();
  }
  return {
    svg,
    terrain,
    layer,
    ocean,
    hitArea,
    setPan,
    setZoom,
    pointerDown,
    pointerMove,
    pointerUp,
    clicked,
  };
}
