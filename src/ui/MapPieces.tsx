import { MapSprite } from "./MapSprite";
import type { Stock } from "../game/types";
import { localize as tx, useLocale } from "../i18n";
import { MapLabel, MapResourceIcon } from "./MapLabel";
import { memo } from "react";
import type { Town, Raw } from "../game/types";
import { GOOD_INFO } from "../game/content";

function shade(color: string, brightness: number) {
  return (
    "#" +
    [1, 3, 5]
      .map((i) =>
        Math.min(
          255,
          Math.round(parseInt(color.slice(i, i + 2), 16) * brightness),
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Native vector miniatures stay crisp at every map zoom. */
export const TownMiniature = memo(function TownMiniature({
  town: t,
  color,
  selected,
}: {
  town: Town;
  color: string;
  selected: boolean;
}) {
  useLocale();

  const side = shade(color, 0.63),
    roof = shade(color, 0.83),
    edge = shade(color, 0.4),
    light = shade(color, 1.16);
  return (
    <MapSprite
      assetKey={`town/${color}/${t.level}/${t.wall}/${Object.keys(t.extensions).length}/${selected}`}
      bounds={{ x: -25, y: -34, width: 54, height: 59 }}
      className="town-miniature"
      pointerEvents="none"
    >
      {tx(
        selected && (
          <ellipse
            className="selection-halo"
            cy="4"
            rx="19"
            ry="16"
            fill="#fff1b322"
            stroke="#ffe6a0"
            strokeWidth="2"
          />
        ),
      )}
      <ellipse cy="10" rx="16" ry="7" fill="#172e35" opacity=".18" />
      <ellipse cy="9" rx="14" ry="6" fill="#172e35" opacity=".3" />
      <path
        d="M-13 5 0-2 14 5 1 13Z"
        fill={side}
        stroke="#c7c9b4"
        strokeWidth="1"
      />
      {tx(
        t.wall > 0 && (
          <ellipse
            cy="5"
            rx="16"
            ry="10"
            fill="#69776d"
            stroke={t.wall === 1 ? "#8c623f" : "#788581"}
            strokeWidth="3"
            strokeDasharray={t.wall === 1 ? "2 1" : "5 1"}
          />
        ),
      )}
      {tx(
        t.level === 1 ? (
          <>
            <path
              d="M-9-3V6L0 11V1Z"
              fill={color}
              stroke={edge}
              strokeWidth=".7"
            />
            <path
              d="M0 1 10-4V6L0 11Z"
              fill={side}
              stroke={edge}
              strokeWidth=".7"
            />
            <path
              d="M-12-3-3-13 12-5 2 4Z"
              fill={roof}
              stroke={edge}
              strokeWidth="1"
            />
            <path d="M-3-13 2 4 12-5Z" fill="#102d35" opacity=".17" />
            <path
              d="M-8-4-3-10 0-4"
              fill="none"
              stroke={light}
              strokeWidth=".8"
              opacity=".9"
            />
            <path d="M3 9V3L6 1.5V7.5Z" fill="#192e32" />
            <path d="M-6 0-3 1.5V4.5L-6 3Z" fill="#20353a" />
          </>
        ) : (
          <>
            <path d="M-12-3-1-9 12-2 1 5Z" fill={roof} />
            <path
              d="M-12-3V7L1 14V5Z"
              fill={color}
              stroke={edge}
              strokeWidth=".7"
            />
            <path
              d="M1 5 12-2V8L1 14Z"
              fill={side}
              stroke={edge}
              strokeWidth=".7"
            />
            <path
              d={`M-4 4V${-12 - (t.level - 2) * 3}L2 ${-16 - (t.level - 2) * 3} 8 ${-12 - (t.level - 2) * 3}V5L2 9Z`}
              fill={color}
              stroke={edge}
              strokeWidth=".8"
            />
            <path
              d={`M2 9V${-16 - (t.level - 2) * 3}L8 ${-12 - (t.level - 2) * 3}V5Z`}
              fill={side}
            />
            <path
              d={`M-6 ${-12 - (t.level - 2) * 3} 1 ${-22 - (t.level - 2) * 3} 10 ${-12 - (t.level - 2) * 3} 2 ${-7 - (t.level - 2) * 3}Z`}
              fill={roof}
              stroke={edge}
              strokeWidth=".9"
            />
            <path
              d="M-12 6V-6L-6-9-1-5V10L-6 12Z"
              fill={color}
              stroke={edge}
              strokeWidth=".8"
            />
            <path
              d="M-14-6-8-15 1-5-6-2Z"
              fill={roof}
              stroke={edge}
              strokeWidth=".8"
            />
            {tx(
              t.level >= 3 && (
                <>
                  <path
                    d="M8 7V-9L13-12 17-8V7L13 10Z"
                    fill={color}
                    stroke={edge}
                    strokeWidth=".8"
                  />
                  <path
                    d="M6-9 12-18 19-8 13-5Z"
                    fill={color}
                    stroke={edge}
                    strokeWidth=".8"
                  />
                </>
              ),
            )}
            <path d="M-8 11V4Q-6 1-4 3V10Z" fill="#1e3137" />
            <path d="M0-3V-7M4-6V-10" stroke="#20353a" strokeWidth="1.7" />
            {tx(
              t.level === 4 && (
                <path
                  d="M13-18V-27L23-23 13-20"
                  fill={color}
                  stroke={edge}
                  strokeWidth=".7"
                />
              ),
            )}
          </>
        ),
      )}
      {tx(
        t.wall > 0 && (
          <path
            d="M-15 8Q0 22 15 8"
            fill="none"
            stroke={t.wall === 1 ? "#9b744b" : "#8e9f92"}
            strokeWidth="3"
            strokeDasharray={t.wall === 1 ? "2 1" : "4 1"}
          />
        ),
      )}
      {tx(
        t.level > 1 && (
          <g transform="translate(13 14)">
            <rect
              x="-7"
              y="-5"
              width="14"
              height="10"
              rx="3"
              fill="#244842"
              stroke="#eee2bc"
              strokeWidth=".7"
            />
            <MapLabel
              y="2.8"
              textAnchor="middle"
              fontSize="7"
              fontWeight="750"
              fill="#fff0c8"
            >
              {tx(["", "", "I", "II", "III"][t.level])}
            </MapLabel>
          </g>
        ),
      )}
      {tx(
        Object.keys(t.extensions).length > 0 && (
          <g transform="translate(-11 15)">
            {tx(
              Object.keys(t.extensions).map((id, i) => (
                <circle
                  key={id}
                  cx={i * 4}
                  r="1.6"
                  fill="#ffe9aa"
                  stroke="#4f6c56"
                  strokeWidth=".6"
                />
              )),
            )}
          </g>
        ),
      )}
    </MapSprite>
  );
});

export const ProductionToken = memo(function ProductionToken({
  resource,
  output,
  baseOutput,
  compact = false,
  number,
  showNumber,
  active,
  dormant = false,
}: {
  resource: Raw;
  output?: Stock;
  baseOutput?: Stock;
  compact?: boolean;
  number: number;
  showNumber: boolean;
  active: boolean;
  dormant?: boolean;
}) {
  useLocale();

  const pips = 6 - Math.abs(7 - number);
  const baseline = baseOutput ?? { [resource]: 1 };
  const products = Object.entries(
    dormant ? baseline : (output ?? baseline),
  ).map(([good, quantity]) => [good, dormant ? 0 : quantity] as [Raw, number]);
  if (!products.length) products.push([resource, dormant ? 0 : 1]);
  const productLabel = products
    .map(([good, quantity]) => `${quantity} ${tx(GOOD_INFO[good].name)}`)
    .join(" + ");
  const iconSize = compact ? 11 : 12,
    numberSize = compact ? 8 : 9,
    iconGap = compact ? 1 : 2,
    productGap = compact ? 2 : 3;
  const widths = products.map(
    ([, quantity]) =>
      iconSize + iconGap + String(quantity).length * numberSize * 0.6,
  );
  const rowWidth =
    widths.reduce((sum, width) => sum + width, 0) +
    (products.length - 1) * productGap;
  const pillWidth = Math.max(compact ? 40 : 48, rowWidth + 5);
  const tooltip = `${dormant ? `${tx("No harvest this season")} · ` : ""}${productLabel}${tx(": roll ")}${number}, ${pips}${tx(" of 36 dice combinations")}${tx(active ? "; matches the current roll" : "")}`;
  return (
    <g
      className={`production-token ${active ? "producing" : ""} ${dormant ? "dormant" : ""}`}
      pointerEvents="none"
      data-number={showNumber ? number : undefined}
      style={{ filter: "none" }}
      fontFamily="ui-sans-serif, system-ui, sans-serif"
    >
      <title>{tooltip}</title>
      <MapSprite
        assetKey={`production/${resource}/${JSON.stringify(products)}/${compact}/${number}/${showNumber}/${active}/${dormant}`}
        bounds={{
          x: -Math.max(pillWidth / 2, 14) - 4,
          y: showNumber ? -16 : 3,
          width: Math.max(pillWidth, 28) + 8,
          height: showNumber ? 47 : 21,
        }}
        className="production-token-art"
        aria-hidden="true"
        style={{
          filter: active
            ? "drop-shadow(0 0 2px #f5c975aa)"
            : "drop-shadow(0 1px 1px #21373065)",
        }}
      >
        <rect
          x={-pillWidth / 2}
          y={showNumber ? 14 : 7}
          width={pillWidth}
          height="13"
          rx="5"
          fill={dormant ? "#e4e7df" : "url(#token-paper)"}
          stroke={active ? "#c89c42" : "#8a795b"}
          strokeWidth=".6"
        />
        {tx(
          showNumber && (
            <>
              <path d="M-7 9H7V18H-7Z" fill="#fff3d7" />
              <circle
                cy="1"
                r="13"
                fill="url(#token-paper)"
                stroke={active ? "#b67d28" : "#9c8963"}
                strokeWidth={active ? 1.6 : 0.7}
              />
              <circle
                cy="1"
                r="11"
                fill="none"
                stroke="#bcaa7c"
                strokeWidth=".4"
              />
              <MapLabel
                y="5"
                textAnchor="middle"
                fontSize="14.5"
                fontWeight="800"
                fill={
                  number === 7
                    ? "#ae3f2f"
                    : number === 6 || number === 8
                      ? "#8e572d"
                      : "#34433c"
                }
              >
                {tx(number)}
              </MapLabel>
              {tx(
                Array.from({ length: pips }, (_, i) => (
                  <circle
                    key={i}
                    cx={(i - (pips - 1) / 2) * 2.3}
                    cy="9"
                    r=".72"
                    fill={number === 7 ? "#ad4530" : "#8c754a"}
                  />
                )),
              )}
            </>
          ),
        )}
        <g>
          {products.map(([good, quantity], i) => (
            <g
              key={good}
              transform={`translate(${-rowWidth / 2 + widths.slice(0, i).reduce((sum, width) => sum + width, 0) + i * productGap}, ${(showNumber ? 14 : 7) + (13 - iconSize) / 2})`}
            >
              <MapResourceIcon good={good} size={iconSize} />
              <MapLabel
                x={(widths[i] + iconSize + iconGap) / 2}
                y={iconSize / 2 + numberSize * 0.36}
                fontSize={numberSize}
                textAnchor="middle"
                fill="#30493f"
              >
                {quantity}
              </MapLabel>
            </g>
          ))}
        </g>
      </MapSprite>
      <g className="production-resources" aria-label={productLabel} role="img">
        {products.map(([good, quantity]) => (
          <g key={good} data-resource={good} data-quantity={quantity} />
        ))}
      </g>
    </g>
  );
});

export function DiceFace({
  value,
  dormant = false,
}: {
  value: number;
  dormant?: boolean;
}) {
  useLocale();

  const positions: Record<number, number[][]> = {
    1: [[12, 12]],
    2: [
      [6, 6],
      [18, 18],
    ],
    3: [
      [6, 6],
      [12, 12],
      [18, 18],
    ],
    4: [
      [6, 6],
      [18, 6],
      [6, 18],
      [18, 18],
    ],
    5: [
      [6, 6],
      [18, 6],
      [12, 12],
      [6, 18],
      [18, 18],
    ],
    6: [
      [6, 6],
      [18, 6],
      [6, 12],
      [18, 12],
      [6, 18],
      [18, 18],
    ],
  };
  return (
    <svg
      className={`dice-face ${dormant ? "dormant" : ""}`}
      width="32"
      height="32"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="1" y="2" width="22" height="22" rx="5" fill="#877955" />
      <rect
        x="1"
        y=".5"
        width="22"
        height="22"
        rx="5"
        fill="#fff8e6"
        stroke="#cbbd99"
        strokeWidth=".7"
      />
      {tx(
        positions[value].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y - 1} r="1.8" fill="#3a5147" />
        )),
      )}
    </svg>
  );
}

/** Each fleet class has a distinct rig or hull, independent of ownership color. */
export function ShipMiniature({ kind }: { kind: string }) {
  const double = kind === "convoy" || kind === "carrack",
    war = kind === "galley" || kind === "carrack";
  return (
    <svg viewBox="0 0 48 48" width="45" height="45" aria-hidden="true">
      <path
        d="M4 38Q10 35 16 38T28 38T42 38M9 43Q14 40 20 43T33 43"
        fill="none"
        stroke="#79a4a5"
        strokeWidth="1"
      />
      {tx(
        kind === "galley" && (
          <path
            d="M12 31 6 40M19 32 13 41M26 32 20 41M33 31 27 40"
            stroke="#a27b4b"
            strokeWidth="1.6"
          />
        ),
      )}
      <path
        d="M5 29 13 35H35L43 27 29 30Z"
        fill={war ? "#4b6267" : "#936344"}
        stroke="#344c4e"
        strokeWidth="1"
      />
      <path d="M10 30 16 32H35" fill="none" stroke="#d7ba7d" />
      <path d="M25 31V5" stroke="#735d3c" strokeWidth="1.5" />
      <path
        d="M23 8Q11 14 9 25L23 24Z"
        fill="#fff5d9"
        stroke="#aa9974"
        strokeWidth=".6"
      />
      <path
        d="M27 9Q35 16 37 24L27 22Z"
        fill={war ? "#b6664a" : "#e2d6ac"}
        stroke="#aa9974"
        strokeWidth=".6"
      />
      <path d="M25 5V1L33 4Z" fill={war ? "#b85940" : "#497c72"} />
      {tx(
        double && (
          <>
            <path d="M37 29V12" stroke="#735d3c" strokeWidth="1.2" />
            <path
              d="M35 14Q29 19 30 26L35 25Z"
              fill="#fff3d1"
              stroke="#aa9974"
              strokeWidth=".6"
            />
          </>
        ),
      )}
      {tx(
        kind === "carrack" && (
          <>
            <path
              d="M8 27V22H15V29M36 27V22H41V26"
              fill="#637b7b"
              stroke="#364f52"
              strokeWidth="1"
            />
            <path
              d="M16 31H32"
              stroke="#ded5b3"
              strokeWidth="2"
              strokeDasharray="2 3"
            />
          </>
        ),
      )}
    </svg>
  );
}
