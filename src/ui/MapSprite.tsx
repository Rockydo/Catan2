import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type SVGProps,
} from "react";
import { useLocale } from "../i18n";
import { retainedCache } from "./retained-cache";

type Bounds = { x: number; y: number; width: number; height: number };
type Asset = { url: string; ready: Promise<void> };
// SVG image decoding is shared by identical miniatures. The browser can reuse
// the painted image instead of walking dozens of paths at every wheel notch.
// Keep vectors inside the image so high zoom and high-DPI displays stay sharp.
const assets = retainedCache<Asset>(256);

const Preparation = createContext<{
  pending: Promise<void>[];
  collecting: boolean;
} | null>(null);

/** Prepare the initial decorative images before laying out their throwaway
 * vector fallbacks. A failed or stalled decoder still reveals playable vectors. */
export function PreparedMapLayer({
  children,
  layerRef,
}: {
  children: ReactNode;
  layerRef: RefObject<HTMLDivElement | null>;
}) {
  const batch = useRef({ pending: [] as Promise<void>[], collecting: true });
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
    <Preparation.Provider value={batch.current}>
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

/** Cache purely decorative vectors; keep hit targets and accessible labels in
 * the live map. Until decoding succeeds, render the exact original artwork. */
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
  const locale = useLocale(),
    key = `${locale}/${assetKey}`;
  const preparation = useContext(Preparation);
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
      const image = new Image();
      image.src = source;
      return { url: source, ready: image.decode() };
    });
    if (!lease) return;
    const asset = lease.value;
    let active = true;
    const source = asset.url;
    if (preparation?.collecting) preparation.pending.push(asset.ready);
    asset.ready
      .then(() => {
        if (active) setDecoded({ key, url: source });
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
