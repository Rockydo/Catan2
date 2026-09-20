import { localize as tx, useLocale } from "../i18n";
import { memo, type SVGProps } from "react";
import font from "./map-font.json";
import french from "../i18n/fr.json";
import { GOOD_INFO } from "../game/content";
import { RAW } from "../game/types";
import type { Raw } from "../game/types";
import { ResourceIcon } from "./ResourceIcon";

type Glyph = { advance: number; commands: (string | number)[][] };
const glyphs = font.glyphs as Record<string, Glyph>;
const cache = new Map<string, { d: string; width: number }>();
function key(text: string, spacing: number) {
  return `${text}@${spacing.toFixed(6)}`;
}
function outline(text: string, spacing: number) {
  const id = key(text, spacing),
    cached = cache.get(id);
  if (cached) return cached;
  let x = 0;
  const commands: string[] = [];
  for (const letter of text) {
    const glyph = glyphs[letter] ?? glyphs["?"];
    for (const [kind, ...values] of glyph.commands)
      commands.push(
        `${kind}${values.map((v, i) => Number(v) + (i % 2 === 0 ? x : 0)).join(" ")}`,
      );
    x += glyph.advance + spacing;
  }
  const result = { d: commands.join(" "), width: Math.max(0, x - spacing) };
  // Army counts and siege labels can change indefinitely in long campaigns.
  if (cache.size >= 512) cache.delete(cache.keys().next().value!);
  cache.set(id, result);
  return result;
}
const common = [
  ...new Set([
    ...RAW.map((g) => GOOD_INFO[g].name),
    ...RAW.map((g) => (french as Record<string, string>)[GOOD_INFO[g].name]),
    "Whales",
    "Baleines",
    ...Array.from({ length: 13 }, (_, i) => String(i)),
    "I",
    "II",
    "III",
    "IV",
    "M",
    "F",
    "?",
    "2:1",
    "3:1",
  ]),
];
const definitions = common.flatMap((text) =>
  [0, (font.em * 0.1) / 8.5, (font.em * 0.1) / 7.5].map((spacing) => ({
    text,
    spacing,
  })),
);
const ids = new Map(
  definitions.map(({ text, spacing }, i) => [
    key(text, spacing),
    `map-label-${i}`,
  ]),
);
/** Shared path labels avoid SVG font-layout work on every camera scale. */
export const MapLabelDefinitions = memo(function MapLabelDefinitions() {
  useLocale();

  return (
    <>
      {tx(
        definitions.map(({ text, spacing }) => (
          <path
            key={key(text, spacing)}
            id={ids.get(key(text, spacing))}
            d={outline(text, spacing).d}
          />
        )),
      )}
      {RAW.map((good) => (
        <symbol key={good} id={`map-resource-${good}`} viewBox="0 0 25 25">
          <ResourceIcon good={good} size={25} />
        </symbol>
      ))}
    </>
  );
});
/** Resource artwork is shared once per map, just like the outlined numerals. */
export const MapResourceIcon = memo(function MapResourceIcon({
  good,
  size = 12,
}: {
  good: Raw;
  size?: number;
}) {
  return (
    <use
      className="map-resource-icon"
      data-resource={good}
      href={`#map-resource-${good}`}
      width={size}
      height={size}
      aria-hidden="true"
    />
  );
});
type Props = Omit<SVGProps<SVGTextElement>, "children" | "x" | "y"> & {
  children: string | number;
  x?: string | number;
  y?: string | number;
};
export const MapLabel = memo(function MapLabel({
  children,
  x = 0,
  y = 0,
  fontSize = 12,
  textAnchor,
  letterSpacing = 0,
  fontFamily: _family,
  fontWeight: _weight,
  strokeWidth,
  ...rest
}: Props) {
  useLocale();

  const text = String(children),
    size = Number(fontSize),
    scale = size / font.em,
    spacing = Number(letterSpacing) / scale;
  const shape = outline(text, spacing),
    id = ids.get(key(text, spacing));
  const start =
    Number(x) -
    (textAnchor === "middle"
      ? (shape.width * scale) / 2
      : textAnchor === "end"
        ? shape.width * scale
        : 0);
  return (
    <g {...(rest as SVGProps<SVGGElement>)} aria-label={tx(text)} role="img">
      <title>{tx(text)}</title>
      <g
        transform={`translate(${start} ${y}) scale(${scale} ${-scale})`}
        strokeWidth={
          strokeWidth === undefined ? undefined : Number(strokeWidth) / scale
        }
      >
        {tx(id ? <use href={`#${id}`} /> : <path d={shape.d} />)}
      </g>
    </g>
  );
});
