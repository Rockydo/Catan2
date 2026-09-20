import { localize as tx, useLocale } from "../i18n";
import type { Good } from "../game/types";
import type { ReactNode } from "react";
const ART: Record<Good, ReactNode> = {
  meat: (
    <>
      <path
        d="m15 15 4 4c0 3 4 3 4 0 3-1 1-4-1-4l-4-3Z"
        fill="#f5e6ce"
        stroke="#9a7d64"
        strokeWidth="1.1"
      />
      <path
        d="M4 3c5-3 13 0 15 6 2 5-1 9-7 10C5 20 1 16 1 11 1 7 2 5 4 3Z"
        fill="#a54c42"
        stroke="#74372f"
        strokeWidth="1.2"
      />
      <path
        d="M5 5c4-2 10 0 12 4 2 4-1 7-5 8-5 1-9-2-9-6 0-3 1-5 2-6Z"
        fill="#dc8470"
      />
      <path d="m6 7 3 2 4-1 2 3-2 3-5-1-3-3Z" fill="#b5554d" />
      <path
        d="m5 6 3 3m6-1-2 2m-4 4 3-2"
        fill="none"
        stroke="#f3c3a9"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </>
  ),
  oil: (
    <>
      <path
        d="M12 1C10 6 3 11 3 16a9 7 0 0 0 18 0C21 11 14 6 12 1Z"
        fill="#654523"
        stroke="#382e25"
        strokeWidth="1.2"
      />
      <path
        d="M12 5C11 9 6 13 6 16c0 4 9 6 12 1-5 2-8-3-6-12Z"
        fill="#c89539"
      />
      <path
        d="M8 12c-2 2-2 4-1 5"
        stroke="#ffe6a1"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  fish: (
    <>
      <path
        d="M3 12 1 6 7 8Q15 1 23 12Q15 23 7 16L1 18Z"
        fill="#5ab8ca"
        stroke="#245d77"
        strokeWidth="1.2"
      />
      <path d="M7 12Q16 5 22 12Q16 18 7 12Z" fill="#dcf5ef" />
      <circle cx="18" cy="10" r="1.3" fill="#163f51" />
      <path d="M12 7 10 3 17 6" fill="#398cac" />
    </>
  ),
  gold: (
    <>
      <path
        d="M2 16 5 8 12 5 17 8 22 6 23 18 14 22 5 21Z"
        fill="#956932"
        stroke="#775332"
      />
      <path d="M5 9 11 6 16 10 13 16 7 17 4 14Z" fill="#f8ce4f" />
      <path d="M16 12 21 9 22 17 16 20 13 17Z" fill="#e9ae21" />
      <path d="m7 9 4-2 2 3-5 2Z" fill="#fff2a8" />
    </>
  ),
  goldbars: (
    <>
      <path
        d="M2 15 6 9 16 9 22 15 19 21 5 21Z"
        fill="#cb8e13"
        stroke="#896123"
      />
      <path d="M6 9 16 9 19 15 3 15Z" fill="#ffe18b" />
      <path
        d="M7 8 10 3 18 3 23 9 20 14 10 14Z"
        fill="#ecb52d"
        stroke="#896123"
      />
      <path d="M10 3H18L21 8H8Z" fill="#fff0a6" />
      <path d="M10 10H18" stroke="#ffdc6a" />
    </>
  ),
  lumber: (
    <>
      <path d="M5 7 17 3 23 7 11 12Z" fill="#805431" />
      <path d="m4 12 12-4 6 4-12 5Z" fill="#a96c36" />
      <path d="M4 12v6l6 4v-5Z" fill="#644429" />
      <path d="m10 17 12-5v6l-12 4Z" fill="#956036" />
      <ellipse cx="7" cy="17" rx="3" ry="4" fill="#e2b875" />
      <ellipse cx="7" cy="17" rx="1.3" ry="2.1" fill="none" stroke="#986538" />
    </>
  ),
  brick: (
    <>
      <path d="m3 14 4-7 7-3 7 7 1 8-9 3-9-3Z" fill="#c3613f" />
      <path d="m7 7 7-3 2 9-12 6Z" fill="#e79262" />
      <path d="m16 13 5-2 1 8-9 3Z" fill="#9d462e" />
      <path d="m9 11 4-2m-5 6 5-1" stroke="#a74d32" strokeWidth="1.2" />
    </>
  ),
  wool: (
    <>
      <path
        d="M6 19a5 5 0 0 1-3-8 5 5 0 0 1 6-6 5 5 0 0 1 8 0 5 5 0 0 1 5 7 5 5 0 0 1-5 8Z"
        fill="#fff8df"
        stroke="#aa9d7c"
      />
      <path
        d="M8 7c-6 5 8 10 9 0M6 12c1 7 11 1 12 6M10 5c8 4-7 11 2 15"
        fill="none"
        stroke="#d0bd96"
        strokeWidth="1.2"
      />
    </>
  ),
  grain: (
    <>
      <path d="M12 23V3m0 11-6-5m6 9 7-5" stroke="#9e7021" strokeWidth="1.7" />
      <g fill="#edbf48" stroke="#ad7b20" strokeWidth=".6">
        <ellipse cx="9" cy="7" rx="2" ry="4" transform="rotate(-38 9 7)" />
        <ellipse cx="15" cy="6" rx="2" ry="4" transform="rotate(38 15 6)" />
        <ellipse cx="8" cy="12" rx="2" ry="4" transform="rotate(-50 8 12)" />
        <ellipse cx="16" cy="11" rx="2" ry="4" transform="rotate(50 16 11)" />
        <ellipse cx="8" cy="17" rx="2" ry="4" transform="rotate(-50 8 17)" />
        <ellipse cx="16" cy="16" rx="2" ry="4" transform="rotate(50 16 16)" />
      </g>
    </>
  ),
  ore: (
    <>
      <path d="m2 17 4-10 8-4 8 9-2 8-12 2Z" fill="#60758b" />
      <path d="m6 7 8-4 1 10-13 4Z" fill="#93a9bb" />
      <path d="m15 13 7-1-2 8-12 2Z" fill="#354a61" />
      <path
        d="m10 6 3 7-5 6m5-6 6 3"
        fill="none"
        stroke="#deaa78"
        strokeWidth="2"
      />
    </>
  ),
  stone: (
    <>
      <path d="m3 9 9-5 9 5 2 11-12 3-9-5Z" fill="#a8aba4" />
      <path d="m3 9 9-5 9 5-10 5Z" fill="#e3e0cf" />
      <path d="m11 14 10-5 2 11-12 3Z" fill="#929991" />
      <path d="m6 11 4 3-2 6" fill="none" stroke="#737d74" />
    </>
  ),
  hides: (
    <>
      <path
        d="m5 2 4 3h6l4-3 3 5-4 4v5l4 5-5 2-5-4-5 4-5-2 4-5v-5L2 7Z"
        fill="#c28b50"
        stroke="#875934"
        strokeWidth="1"
      />
      <path d="m8 8 4-2 4 2-1 7-3 2-3-2Z" fill="#e7bd85" />
      <path d="M12 7v9" stroke="#a87743" strokeDasharray="1 2" />
    </>
  ),
  salt: (
    <>
      <path d="m3 19 5-9 5 9Z" fill="#fffdf1" stroke="#93b7bd" />
      <path d="m10 19 5-15 7 15Z" fill="#e4f6f6" stroke="#8eafb6" />
      <path d="M15 4v15h7" fill="#fff" stroke="#a7c7cc" />
      <path d="M3 20h19l-3 3H6Z" fill="#c7dedc" />
    </>
  ),
  coal: (
    <>
      <path d="m2 13 5-8 8 2 5-3 3 12-6 6H6Z" fill="#30383d" stroke="#17242b" />
      <path
        d="m7 5 3 8 5-6m-5 6 7 9 3-18"
        fill="none"
        stroke="#677783"
        strokeWidth="1.5"
      />
      <path d="m3 14 5-1 3 7-5-2Z" fill="#4d5860" />
    </>
  ),
  planks: (
    <>
      <path d="m2 7 17-4 4 3L6 11Z" fill="#deb57c" stroke="#996637" />
      <path d="m2 12 17-4 4 3-17 5Z" fill="#c99556" stroke="#996637" />
      <path d="m2 17 17-4 4 3-17 5Z" fill="#e5c08a" stroke="#996637" />
      <path d="m6 21 17-5v3L6 24 2 20v-3l4 4Z" fill="#936131" />
      <path d="m7 8 11-3M7 18l10-3" stroke="#b7864d" />
    </>
  ),
  ceramics: (
    <>
      <path
        d="M8 3h8v3l-1 1c0 4 5 5 5 10s-4 6-8 6-8-1-8-6 5-6 5-10L8 6Z"
        fill="#c66d49"
        stroke="#904a35"
      />
      <path
        d="M9 8c0 4-3 5-3 9 0 2 1 3 3 4"
        stroke="#eda47a"
        strokeWidth="2"
        fill="none"
      />
      <ellipse cx="12" cy="3" rx="4" ry="1.2" fill="#743f30" />
      <path d="M5 15h14" stroke="#e9bd80" strokeWidth="2" />
    </>
  ),
  cloth: (
    <>
      <path d="m3 4 15-1 4 14-15 5Z" fill="#608da4" stroke="#315b78" />
      <path d="m3 4 4 18 8-2-3-15Z" fill="#9fc8d4" />
      <path d="m14 4 4 14m-9-9 1 8" stroke="#d8e5da" strokeWidth="1.2" />
      <path d="m7 22 15-5-1 5H8Z" fill="#396c8b" />
    </>
  ),
  provisions: (
    <>
      <path
        d="M3 16c-2-7 1-11 9-12s13 6 9 14l-8 5-9-3Z"
        fill="#c6873e"
        stroke="#885524"
      />
      <path d="M3 14C2 5 13 2 19 7c2 2 3 5 2 8l-9 5Z" fill="#edbd6a" />
      <path
        d="m8 7 2 5m3-7 2 5m2-3 2 4"
        stroke="#995d2b"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="m2 18 9 4 12-6" fill="none" stroke="#f5d698" />
    </>
  ),
  steel: (
    <>
      <path d="m3 10 13-5 6 4-3 9-13 4-4-5Z" fill="#708c9d" stroke="#456173" />
      <path d="m3 10 13-5 6 4-13 5Z" fill="#d4e3e7" />
      <path d="m9 14 13-5-3 9-13 4Z" fill="#8eacbc" />
      <path d="m11 14 7-2" stroke="#eef7f7" strokeWidth="1.4" />
    </>
  ),
  masonry: (
    <>
      <g stroke="#7e837c" strokeLinejoin="round">
        <path d="m2 7 7-3 6 3-7 3Z" fill="#ece7d5" />
        <path d="M2 7v7l6 3v-7Z" fill="#bcbfaf" />
        <path d="m8 10 7-3v7l-7 3Z" fill="#8d9b93" />
        <path d="m10 14 7-3 6 3-7 3Z" fill="#e4dfce" />
        <path d="M10 14v7l6 3v-7Z" fill="#bcbfaf" />
        <path d="m16 17 7-3v7l-7 3Z" fill="#8d9b93" />
      </g>
    </>
  ),
  leather: (
    <>
      <path
        d="M4 6c0-3 9-4 10 0l7 12c2 4-7 6-9 2L5 9Z"
        fill="#b27645"
        stroke="#714b31"
      />
      <path d="m4 6 9 1 8 11-10 3Z" fill="#d69961" />
      <ellipse cx="8" cy="6" rx="4" ry="2.6" fill="#845232" stroke="#63432c" />
      <ellipse cx="8" cy="6" rx="2" ry="1.1" fill="#dcad77" />
      <path d="m13 10 4 7" stroke="#f0c28a" strokeWidth="1.2" />
    </>
  ),
  reagents: (
    <>
      <path
        d="M9 2h6v3h-1v5l7 10c1 2-1 3-3 3H6c-2 0-4-1-3-3l7-10V5H9Z"
        fill="#c0e4d7"
        stroke="#377e78"
      />
      <path d="m7 15-3 5c-1 1 1 2 2 2h12c2 0 3-1 2-2l-3-5Z" fill="#3aa59b" />
      <circle cx="10" cy="18" r="1" fill="#d6faf1" />
      <circle cx="14" cy="12" r="1" fill="#78c2ac" />
      <path d="M11 5v5l-3 5" fill="none" stroke="#f0fffa" strokeWidth="1.4" />
    </>
  ),
  coke: (
    <>
      <path d="m4 14 6-4 10 2 3 7-7 4-13-3Z" fill="#383b40" stroke="#1d292e" />
      <path d="m5 15 5 2 6-3 5 4-6 3-10-2Z" fill="#d86b34" />
      <path d="M10 13c-6-4 0-8 0-12 6 4 0 5 5 7 5-5 5 4 0 6Z" fill="#ec9840" />
      <path d="M11 12c-2-2 1-4 1-6 3 3 4 5 1 7Z" fill="#ffe49b" />
    </>
  ),
};
export function ResourceIcon({
  good,
  size = 24,
}: {
  good: Good;
  size?: number;
}) {
  useLocale();

  return (
    <svg
      className="resource-icon"
      width={size}
      height={size}
      viewBox="0 0 25 25"
      aria-hidden="true"
      focusable="false"
    >
      {tx(ART[good])}
    </svg>
  );
}
