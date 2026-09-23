import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type SVGProps,
} from "react";
import { useLocale } from "../i18n";
import { retainedCache } from "./retained-cache";
import { rasterizeSprite, spriteRasterScale } from "./sprite-raster";

type Bounds = { x: number; y: number; width: number; height: number };
type Asset = { ready: Promise<string> };
// Displayed images stay shared. Keep a smaller idle window for raster assets,
// releasing blob storage only when no map miniature uses the image anymore.
const assets = retainedCache<Asset>(64, (asset) => {
  void asset.ready.then(
    (url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    },
    () => {},
  );
});

const Preparation = createContext<{
  batch: { pending: Promise<unknown>[]; collecting: boolean };
  scale: number;
} | null>(null);

/** Prepare the initial decorative images before laying out their throwaway
 * vector fallbacks. A failed or stalled decoder still reveals playable vectors. */
export function PreparedMapLayer({
  children,
  layerRef,
  bounds,
  maxZoom,
}: {
  children: ReactNode;
  layerRef: RefObject<HTMLDivElement | null>;
  bounds: { w: number; h: number };
  maxZoom: number;
}) {
  const batch = useRef({ pending: [] as Promise<unknown>[], collecting: true });
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1 : window.innerWidth,
    height: typeof window === "undefined" ? 1 : window.innerHeight,
    dpr: typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
  }));
  const scale = spriteRasterScale(bounds, maxZoom, viewport);
  const preparation = useMemo(() => ({ batch: batch.current, scale }), [scale]);
  useEffect(() => {
    const resize = () =>
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
      });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    let active = true;
    const reveal = () => {
      if (!active) return;
      active = false;
      batch.current.collecting = false;
      batch.current.pending.length = 0;
      clearTimeout(timeout);
      setReady(true);
    };
    const timeout = setTimeout(reveal, 250);
    // Child layout effects have registered the initial scene's images.
    void Promise.allSettled(batch.current.pending).then(reveal);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);
  return (
    <Preparation.Provider value={preparation}>
      <div
        ref={layerRef}
        className="map-camera-layer"
        style={ready ? undefined : { display: "none" }}
      >
        {children}
      </div>
    </Preparation.Provider>
  );
}

function encode(node: SVGGElement, bounds: Bounds): string | undefined {
  const serializer = new XMLSerializer(),
    ids = new Set<string>(),
    definitions: string[] = [];
  let missing = false;
  const collect = (root: Element) => {
    for (const element of [root, ...root.querySelectorAll("*")])
      for (const attribute of element.attributes) {
        const references = Array.from(
          attribute.value.matchAll(/url\(#([^)]*)\)/g),
          (m) => m[1],
        );
        if (attribute.localName === "href" && attribute.value.startsWith("#"))
          references.push(attribute.value.slice(1));
        for (const id of references) {
          if (ids.has(id)) continue;
          ids.add(id);
          const definition = node.ownerDocument.getElementById(id);
          if (!definition) {
            missing = true;
            continue;
          }
          collect(definition);
          definitions.push(serializer.serializeToString(definition));
        }
      }
  };
  collect(node);
  if (missing) return undefined;
  const { x, y, width, height } = bounds;
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}"><defs>${definitions.join("")}</defs><style>.resource-icon{filter:drop-shadow(0 1px 0 #fff9)}</style>${serializer.serializeToString(node)}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** Cache purely decorative artwork; keep hit targets and accessible labels in
 * the live map. Until decoding succeeds, render the exact original vectors. */
export function MapSprite({
  assetKey,
  bounds,
  children,
  ...props
}: {
  assetKey: string;
  bounds: Bounds;
  children: ReactNode;
} & Omit<SVGProps<SVGGElement>, "children" | "ref">) {
  const preparation = useContext(Preparation);
  const locale = useLocale(),
    scale =
      preparation?.scale ??
      4 * (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1),
    key = `${locale}/${assetKey}@${scale}`;
  const node = useRef<SVGGElement>(null);
  const [decoded, setDecoded] = useState<{ key: string; url: string }>();
  const [failed, setFailed] = useState<string>();
  const url = decoded?.key === key && failed !== key ? decoded.url : undefined;
  useLayoutEffect(() => {
    const element = node.current;
    if (failed === key || !element) return;
    const lease = assets.retain(key, () => {
      const source = encode(element, bounds);
      if (!source) return;
      return { ready: rasterizeSprite(source, bounds, scale) };
    });
    if (!lease) return;
    const asset = lease.value;
    let active = true;
    if (preparation?.batch.collecting)
      preparation.batch.pending.push(asset.ready);
    asset.ready
      .then((url) => {
        if (active) setDecoded({ key, url });
      })
      .catch(() => {
        if (active) setFailed(key);
      });
    return () => {
      active = false;
      lease.release();
    };
  }, [key, failed]);
  return (
    <g
      {...props}
      ref={node}
      style={url ? { ...props.style, filter: "none" } : props.style}
    >
      {url ? (
        <image
          {...bounds}
          href={url}
          pointerEvents="none"
          onError={() => setFailed(key)}
        />
      ) : (
        children
      )}
    </g>
  );
}
