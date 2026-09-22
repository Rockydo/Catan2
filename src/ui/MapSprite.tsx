import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { useLocale } from "../i18n";

type Bounds = { x: number; y: number; width: number; height: number };
type Asset = { url: string; ready: Promise<void> };
// SVG image decoding is shared by identical miniatures. The browser can reuse
// the painted image instead of walking dozens of paths at every wheel notch.
// Keep vectors inside the image so high zoom and high-DPI displays stay sharp.
const assets = new Map<string, Asset>();
const LIMIT = 256;

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
  const node = useRef<SVGGElement>(null);
  const [decoded, setDecoded] = useState<{ key: string; url: string }>();
  const [failed, setFailed] = useState<string>();
  const url = decoded?.key === key && failed !== key ? decoded.url : undefined;
  useLayoutEffect(() => {
    if (url || failed === key || !node.current) return;
    let asset = assets.get(key);
    if (!asset) {
      const source = encode(node.current, bounds);
      if (!source) return;
      const image = new Image();
      image.src = source;
      asset = { url: source, ready: image.decode() };
      if (assets.size >= LIMIT) assets.delete(assets.keys().next().value!);
      assets.set(key, asset);
    }
    let active = true;
    const source = asset.url;
    asset.ready
      .then(() => {
        if (active) setDecoded({ key, url: source });
      })
      .catch(() => {
        if (active) setFailed(key);
      });
    return () => {
      active = false;
    };
  }, [key, url, failed]);
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
