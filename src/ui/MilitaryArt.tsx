import { maxValue } from "../game/aggregate";
import { localize as tx, useLocale } from "../i18n";
import { MapLabel } from "./MapLabel";
import { MapSprite } from "./MapSprite";
import { memo, useId, useMemo, type CSSProperties } from "react";
import type { Piece, UnitClass } from "../game/types";
import {
  COLORS,
  UNIT_INFO,
  SHIP_INFO,
  ROMAN,
  shipStats,
  isSettler,
} from "../game/content";
import { ShipMiniature } from "./MapPieces";

export const RANK_METAL = ["", "#ad8054", "#97a895", "#aebfc3", "#dab45f"];

/** Bold silhouettes share one visual language from 16px controls to map counters. */
export function MilitaryGlyph({
  kind,
  tier = 1,
  ink = "#f6e7bd",
  shadow = "#344e50",
  accent = "#ddb669",
}: {
  kind: string;
  tier?: number;
  ink?: string;
  shadow?: string;
  accent?: string;
}) {
  useLocale();

  if (isSettler(kind))
    return (
      <g stroke={shadow} strokeWidth="1.3" strokeLinejoin="round">
        {kind === "settlership" ? (
          <>
            <path d="M2 23H30L24 30H8Z" fill={ink} />
            <path d="M9 22V3L27 8 10 20Z" fill={accent} />
            <path d="M14 11 19 6 24 11V17H14Z" fill={ink} />
            <path d="M18 17V12H21V17" fill={shadow} />
          </>
        ) : (
          <>
            <path d="M4 18V12Q16-1 28 12V22H4Z" fill={ink} />
            <path d="M10 21V10Q16 5 22 10V21Z" fill={accent} />
            <path d="M3 21H30V25H5Z" fill={accent} />
            <circle cx="9" cy="28" r="3" fill={shadow} />
            <circle cx="25" cy="28" r="3" fill={shadow} />
            <path d="M13 17 17 13 21 17V22H13Z" fill={ink} />
          </>
        )}
      </g>
    );
  if (kind === "merchant")
    return (
      <g stroke={shadow} strokeWidth="1.3" strokeLinejoin="round">
        <path d="M5 14H27L25 25H7Z" fill={ink} />
        <path
          d="M9 14V7H23V14M3 9L7 24"
          fill="none"
          stroke={accent}
          strokeWidth="2"
        />
        <circle cx="9" cy="28" r="3" fill={accent} />
        <circle cx="24" cy="28" r="3" fill={accent} />
        <path d="M12 6 16 2 21 6 19 12H14Z" fill={accent} />
        <path d="M16 5V10" stroke={ink} />
      </g>
    );
  if (kind === "fishing")
    return (
      <g stroke={shadow} strokeWidth="1.2">
        <path d="M2 21H30L24 28H9Z" fill={ink} />
        <path
          d="M10 20V4L26 8 14 19"
          fill="none"
          stroke={accent}
          strokeWidth="2"
        />
        <path
          d="M15 10 25 9 23 21 15 19Z M15 13 24 13 M15 17 23 17 M18 10 18 20 M21 9 21 21"
          fill="none"
          stroke={ink}
        />
        <path d="M1 30Q9 27 16 30T31 30" fill="none" stroke={accent} />
      </g>
    );
  if (kind === "merchantship")
    return (
      <g stroke={shadow} strokeWidth="1.2">
        <path d="M2 22H30L24 29H8Z" fill={ink} />
        <path d="M8 21V4L24 7 9 16" fill={accent} />
        <path d="M13 17H20V23H13Z M21 16H27V23H21Z" fill={accent} />
        <path d="M17 17V23M24 16V23" stroke={ink} />
      </g>
    );
  if (kind === "heavy")
    return (
      <g stroke={shadow} strokeWidth="1.3" strokeLinejoin="round">
        {tx(tier === 4 && <path d="M12 8Q8 0 17 1L24 6 18 7Z" fill={accent} />)}
        <path d="M8 14Q8 4 16 4T24 14V23L20 28H12L8 23Z" fill={ink} />
        <path
          d="M16 5V27L20 28 24 23V14Q24 5 16 5Z"
          fill={shadow}
          opacity=".23"
          stroke="none"
        />
        <path d="M5 15Q16 11 27 15L25 18H7Z" fill={tier > 1 ? accent : ink} />
        <path d="M10 19H14M18 19H22" stroke={shadow} strokeWidth="2.4" />
        <path d="M16 16V25" stroke={tier > 1 ? ink : shadow} strokeWidth="2" />
        {tx(
          tier > 1 && <path d="M10 23 13 26M22 23 19 26" strokeWidth="1.2" />,
        )}
      </g>
    );
  if (kind === "light" || kind === "hunter")
    return (
      <g strokeLinejoin="round" strokeLinecap="round">
        <path
          d="M10 3Q28 16 10 29"
          fill="none"
          stroke={shadow}
          strokeWidth="5"
        />
        <path d="M10 3Q28 16 10 29" fill="none" stroke={ink} strokeWidth="3" />
        <path
          d="M10 3 14 16 10 29"
          fill="none"
          stroke={accent}
          strokeWidth="1.3"
        />
        <path
          d="M3 16H27M23 12 28 16 23 20"
          fill="none"
          stroke={shadow}
          strokeWidth="3.5"
        />
        <path
          d="M3 16H27M23 12 28 16 23 20"
          fill="none"
          stroke={ink}
          strokeWidth="2"
        />
        <path d="M3 12 7 16 3 20" fill="none" stroke={accent} strokeWidth="2" />
        {tx(
          tier >= 2 && (
            <path
              d="M21 6 25 8M21 26 25 24"
              stroke={accent}
              strokeWidth="1.8"
            />
          ),
        )}
        {tx(
          tier === 4 && (
            <path
              d="M4 5 8 8 5 11 1 8Z"
              fill={accent}
              stroke={shadow}
              strokeWidth=".6"
            />
          ),
        )}
      </g>
    );
  if (kind === "cavalry")
    return (
      <g stroke={shadow} strokeWidth="1.2" strokeLinejoin="round">
        <path
          d="M8 28Q9 23 14 18L9 19 5 15 12 8 14 3 17 7Q23 5 26 11L24 15Q21 19 25 28Z"
          fill={ink}
        />
        <path
          d="M18 8Q25 13 19 20L18 28H25Q21 19 24 15L26 11Q23 5 18 8Z"
          fill={shadow}
          opacity=".32"
          stroke="none"
        />
        <path
          d="M12 9 9 14 5 15M12 17 20 12"
          fill="none"
          stroke={accent}
          strokeWidth="1.8"
        />
        <circle cx="15" cy="11" r="1.3" fill={shadow} stroke="none" />
        <path d="M7 28H27" stroke={ink} strokeWidth="2.2" />
        {tx(
          tier >= 2 && (
            <path
              d="M4 3V28M2 4 4 1 6 4Z"
              stroke={tier === 4 ? accent : ink}
              fill={accent}
              strokeWidth="1.6"
            />
          ),
        )}
        {tx(tier === 4 && <path d="M20 18 17 21 20 24 22 21Z" fill={accent} />)}
      </g>
    );
  if (kind === "artillery")
    return (
      <g
        stroke={shadow}
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M4 24H27L24 19H9Z" fill={accent} />
        {tx(
          tier === 1 ? (
            <>
              <path
                d="M16 8V22M5 12Q16 4 27 12M5 12 16 17 27 12"
                fill="none"
                stroke={ink}
                strokeWidth="2.4"
              />
              <path
                d="M16 3V17M13 7 16 3 19 7"
                fill="none"
                stroke={ink}
                strokeWidth="2"
              />
            </>
          ) : tier <= 3 ? (
            <>
              <path
                d="M10 21 17 8 24 21"
                fill="none"
                stroke={ink}
                strokeWidth="3"
              />
              <path d="M10 7 21 24" stroke={accent} strokeWidth="3" />
              <path
                d="M6 4Q6 11 13 10"
                fill="none"
                stroke={ink}
                strokeWidth="2.7"
              />
              <circle cx="8" cy="5" r="2" fill={ink} />
            </>
          ) : (
            <>
              <path d="M8 18 24 7 29 13 12 24Z" fill={ink} />
              <path d="M23 7 28 5 31 11 29 14Z" fill={accent} />
              <path d="M19 11 24 17" stroke={shadow} strokeWidth="1.8" />
            </>
          ),
        )}
        <circle cx="9" cy="25" r="4" fill={ink} />
        <circle cx="24" cy="25" r="4" fill={ink} />
        <circle cx="9" cy="25" r="1.5" fill={shadow} />
        <circle cx="24" cy="25" r="1.5" fill={shadow} />
      </g>
    );
  const convoy = kind === "convoy",
    galley = kind === "galley",
    armored = kind === "carrack";
  return (
    <g stroke={shadow} strokeWidth="1.1" strokeLinejoin="round">
      {tx(
        galley && (
          <path
            d="M7 23 3 29M13 24 9 30M20 24 16 30M27 23 23 29"
            stroke={accent}
            strokeWidth="1.8"
          />
        ),
      )}
      <path d="M3 21 8 27H25L30 20 17 23Z" fill={armored ? accent : ink} />
      <path d="M16 23V3" stroke={accent} strokeWidth="1.8" />
      <path d="M14 5Q5 10 5 18H14Z" fill={ink} />
      <path d="M18 6 26 17H18Z" fill={galley ? accent : ink} />
      {tx(
        (convoy || armored) && (
          <>
            <path d="M26 20V9" stroke={accent} />
            <path d="M25 10 20 18H25Z" fill={ink} />
          </>
        ),
      )}
      {tx(armored && <path d="M6 21V17H11V23M25 21V17H29V21" fill={accent} />)}
      {tx(
        !galley && (
          <path
            d="M5 30Q10 27 16 30T29 30"
            fill="none"
            stroke={ink}
            strokeWidth="1.4"
          />
        ),
      )}
    </g>
  );
}
export function MilitaryIcon({
  kind,
  tier = 1,
  size = 24,
}: {
  kind: string;
  tier?: number;
  size?: number;
}) {
  useLocale();

  return (
    <svg
      className="military-icon"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      data-unit-kind={kind}
    >
      <MilitaryGlyph
        kind={kind}
        tier={tier}
        ink="#466a60"
        shadow="#233f3e"
        accent="#b38943"
      />
    </svg>
  );
}
const CROPS: Record<string, number[][]> = {
  heavy: [
    [225, 142, 194, 235],
    [576, 143, 218, 234],
    [961, 143, 236, 246],
  ],
  light: [
    [217, 435, 235, 235],
    [567, 427, 235, 242],
    [962, 433, 252, 246],
  ],
  cavalry: [
    [213, 698, 265, 260],
    [547, 698, 278, 268],
    [954, 700, 270, 270],
  ],
  artillery: [
    [169, 1001, 293, 223],
    [531, 990, 297, 230],
    [888, 1001, 337, 227],
  ],
};
export function MilitaryPortrait({
  unit,
}: {
  unit: Pick<Piece, "kind" | "tier" | "naval"> & Partial<Pick<Piece, "owner">>;
}) {
  useLocale();

  const clip = useId(),
    color = COLORS[unit.owner ?? 0],
    rank = unit.tier,
    dedicated = unit.naval || unit.kind === "merchant";
  const name = unit.naval
    ? shipStats(unit.kind as keyof typeof SHIP_INFO, rank).name
    : UNIT_INFO[unit.kind as keyof typeof UNIT_INFO].names[rank - 1];
  return (
    <span
      className={`unit-portrait military-portrait ${unit.naval ? "naval-portrait" : ""}`}
      title={tx(name)}
      aria-hidden="true"
      data-unit-kind={unit.kind}
      data-unit-tier={unit.tier}
      style={
        {
          "--rank-metal": RANK_METAL[rank],
          "--unit-owner": color,
        } as CSSProperties
      }
    >
      <svg
        className="portrait-window"
        viewBox="0 0 64 72"
        width="64"
        height="72"
      >
        <defs>
          <clipPath id={clip}>
            <rect x="2" y="2" width="60" height="68" rx="7" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <rect x="2" y="2" width="60" height="68" fill="#edddbc" />
          {isSettler(unit.kind) ||
          unit.kind === "hunter" ||
          unit.kind === "riverboat" ? (
            <image
              href={`./assets/portrait-${unit.kind}${isSettler(unit.kind) ? "" : `-${unit.tier}`}-v1.webp`}
              x="2"
              y="2"
              width="60"
              height="68"
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <svg
              x="2"
              y="2"
              width="60"
              height="68"
              viewBox={
                dedicated
                  ? `${((rank - 1) % 2) * 50} ${Math.floor((rank - 1) / 2) * 50} 50 50`
                  : rank === 2
                    ? {
                        heavy: "0 0 512 512",
                        light: "512 0 512 512",
                        cavalry: "0 480 512 544",
                        artillery: "512 512 512 512",
                      }[
                        unit.kind as "heavy" | "light" | "cavalry" | "artillery"
                      ]
                    : CROPS[unit.kind][rank === 1 ? 0 : rank - 2].join(" ")
              }
              preserveAspectRatio={
                dedicated ? "xMidYMid meet" : "xMidYMid slice"
              }
            >
              <image
                href={
                  dedicated
                    ? `./assets/roster-${unit.kind}-v1.png`
                    : rank === 2
                      ? "./assets/unit-tier-2.png"
                      : "./assets/unit-roster.png"
                }
                width={dedicated ? 100 : rank === 2 ? 1024 : 1254}
                height={dedicated ? 100 : rank === 2 ? 1024 : 1254}
              />
            </svg>
          )}
          <path d="M2 66H62V72H2Z" fill={color} />
        </g>
      </svg>
      <span className="portrait-class">
        <MilitaryIcon kind={unit.kind} tier={unit.tier} size={18} />
      </span>
      {tx(<span className="portrait-rank">{tx(ROMAN[rank])}</span>)}
    </span>
  );
}
export const ArmyMiniature = memo(function ArmyMiniature({
  units,
  color,
  selected,
}: {
  units: Piece[];
  color: string;
  selected: boolean;
}) {
  useLocale();

  const { kinds, ranks, rank, economic, merchant, settler } = useMemo(() => {
    const byKind = new Map<Piece["kind"], number>();
    for (const unit of units)
      byKind.set(unit.kind, Math.max(byKind.get(unit.kind) ?? 0, unit.tier));
    const kinds = [...byKind.keys()],
      ranks = [...byKind.values()];
    const merchant = byKind.has("merchant") || byKind.has("merchantship");
    return {
      kinds,
      ranks,
      rank: maxValue(ranks),
      merchant,
      economic: merchant || byKind.has("fishing") || byKind.has("hunter"),
      settler: kinds.some(isSettler),
    };
  }, [units]);
  return (
    <g pointerEvents="none" data-unit-kinds={kinds.join(",")}>
      <MapSprite
        assetKey={`army/${color}/${Number(selected)}/${kinds.map((kind, i) => `${kind}:${ranks[i]}`).join(",")}`}
        bounds={{
          x: -24,
          y: -28,
          width: 48,
          height: Math.max(56, 28 + Math.floor((kinds.length - 1) / 2) * 12),
        }}
        className="army-miniature-art"
        pointerEvents="none"
      >
        <path
          d="M-16-15Q0-22 16-15V10Q14 19 0 24Q-14 19-16 10Z"
          fill="#102a31"
          opacity=".45"
        />
        {tx(
          selected && (
            <path
              d="M-18-19Q0-26 18-19V8Q16 19 0 24Q-16 19-18 8Z"
              fill="#ffdf9220"
              stroke="#ffe39b"
              strokeWidth="1.5"
            />
          ),
        )}
        {tx(
          kinds.length > 1 && (
            <path
              d="M-17-15Q-2-20 12-15V9L-2 19-17 11Z"
              fill="#314e51"
              stroke="#d9c390"
              strokeWidth="1"
            />
          ),
        )}
        <path
          d="M-14-16Q0-22 14-16V8Q12 16 0 21Q-12 16-14 8Z"
          fill="#213f47"
          stroke={color}
          strokeWidth="3"
        />
        <path
          d="M-12-15Q0-20 12-15"
          fill="none"
          stroke={RANK_METAL[rank]}
          strokeWidth="1.3"
        />
        {tx(
          kinds.length === 1 ? (
            <svg x="-12" y="-14" width="24" height="24" viewBox="0 0 32 32">
              <MilitaryGlyph
                kind={kinds[0]}
                tier={rank}
                accent={RANK_METAL[rank]}
              />
            </svg>
          ) : (
            kinds.map((kind, i) => (
              <svg
                key={kind}
                x={kinds.length === 2 ? -12 + i * 12 : -12 + (i % 2) * 12}
                y={kinds.length === 2 ? -8 : -14 + Math.floor(i / 2) * 12}
                width="12"
                height="12"
                viewBox="0 0 32 32"
              >
                <MilitaryGlyph
                  kind={kind}
                  tier={ranks[i]}
                  accent={RANK_METAL[rank]}
                />
              </svg>
            ))
          ),
        )}
      </MapSprite>
      {tx(
        economic && (
          <g data-testid="economic-unit-marker">
            <circle cx="17" cy="-17" r="8" fill="#f0c34d" stroke="#594722" />
            <MapLabel
              x="17"
              y="-14"
              textAnchor="middle"
              fontSize="9"
              fontWeight="900"
              fill="#403315"
            >
              {tx(merchant ? "M" : "F")}
            </MapLabel>
          </g>
        ),
      )}
      {settler && (
        <g data-testid="settler-unit-marker" transform="translate(-18 -18)">
          <circle r="9" fill="#efe0b4" stroke="#344f45" />
          <path
            d="M-5 0 0-5 5 0V5H-5Z"
            fill={color}
            stroke="#344f45"
            strokeWidth="1"
          />
          <path d="M-1 5V1H2V5" fill="#344f45" />
        </g>
      )}
      <rect
        x={-Math.max(8, String(units.length).length * 2.8 + 3)}
        y="11"
        width={Math.max(16, String(units.length).length * 5.6 + 6)}
        height="11"
        rx="4"
        fill={color}
        stroke="#1d353c"
        strokeWidth=".8"
      />
      <MapLabel
        y="19.2"
        textAnchor="middle"
        fontSize="8"
        fontWeight="850"
        fill="#112e35"
        stroke="#ffedc0"
        strokeWidth=".3"
        paintOrder="stroke"
      >
        {tx(units.length)}
      </MapLabel>
    </g>
  );
});
