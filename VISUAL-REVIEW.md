# Map-first workspace review: September 2026

Three implementation passes covered layout, recruitment and the remaining action panels. The permanent ambition panel and bottom turn footer are removed. Resources, turn identity, dice and turn actions occupy a compact header; a persistent command rail opens an optional inspector. Realms and history use a dismissible drawer. On desktop the map resizes when the inspector opens; mobile uses an overlay above the bottom command rail.

At 1440×900, the closed-inspector map grows from 906×601 to 1380×782 pixels: 98% more area, from 42% to 83% of the viewport. Measurements at 1280×720 and 393×873 show 80% and 78% map coverage respectively. These compare the previous default layout against the new default with drawers closed, not an open-inspector layout.

Recruitment uses one catalogue, Army/Navy selection, a town selector, direct tier buttons, one destination and a shared order quantity. All six tier-II ship purchase buttons fit at 1280×720 and on the tested mobile viewport; the optional full military roster may still require scrolling. Tier and Army/Navy preferences persist in the browser session. Price displays include the whole order and free research commissions. Unit stats retain text/tooltips, painted portraits, faction identity and Roman ranks.

Army commands precede composition and merchant harvesting details. Enemy composition stays inspectable. Bank trading begins at the exchange controls. Held research cards precede purchases; public card counts and the four purchase tiers use compact grids with expandable effect references. Keyboard shortcuts and dismissible drawers supplement pointer controls.

Visual evidence: `test-artifacts/ux-final-*.png`, `ux-navy-*.png`, `ux-map-*.png`, `ux-metrics.json`, and the unchanged `ux-before/` baseline. Reproduce with `npx tsx scripts/ux-review.ts`; the script uses isolated saves, never the player's browser profile. Historical reviews follow.

# Dice and military review: 2.2

The 2.2 pass reviews the actual components and production interface, retaining the darker faction towns approved in 2.1.

1. Dice presentation: 3D tumble, landing, four faction receipts, exact resource icons and gains, producing-hex highlights and replay. Desktop, laptop, mobile and 320px compact screenshots are in `test-artifacts/roll/`. A mobile overflow issue was fixed by scrolling only receipts, keeping dice and close controls visible. Empty-state contrast was corrected in Firefox and mobile.
2. Military identity: all twelve source portrait crops reviewed together with original class glyphs and mixed-stack counters in `test-artifacts/military/roster.png`. Map markers moved away from dice tokens; occupied-hex labels use a compact inset. Portraits keep names, class and tier text in recruitment and selection. Added a dedicated counter hit target after browser tests found decorative geometry intercepting clicks.
3. Interface review: selected-unit rows, Roman badges, faction identity, research intelligence and bank ordering reviewed on desktop and mobile. Army summary contrast was strengthened after axe-core reported its small labels. Opponent extension panels show only built extensions and offer no construction buttons.

Reproduce with `npx tsx scripts/roll-review.ts`, `npx tsx scripts/military-review.tsx` and the full browser suite. These scripts use isolated fixtures and never overwrite a player's browser profile. See `TESTING.md` for final results. Historical 2.1 review follows.

# Visual polish: 2.1

Reviewed against the production build on 11 September 2026. This update refines the existing painted terrain and native interface; it does not change game rules or save format.

## Review passes

1. **Map hierarchy.** Removed the double water grid and repetitive waves, softened coastlines, rebuilt number medallions with real probability pips, kept resource labels inside hexes, and moved harbors offshore. Harbor badges show their trade resource and ratio and open an explanation by click or keyboard.
2. **Interface clarity.** Improved text contrast, spacing, selected states, panel tabs, recipe layout, resource counts, dice and phase indicators. Recruitment now uses all twelve illustrated unit portraits; four ship classes have distinct vector hulls and rigs. Resource identifiers in deployment and industry now use their actual display names. Fully developed extensions say “Maximum extension tier.”
3. **Responsive and interaction review.** Mobile keeps dice visible, stacks resource counts beneath icons, and puts Actions & realm beside the turn controls. Large totals use compact notation with the exact amount available in the accessible name, tooltip and resource guide. Wheel zoom stays at the pointer; dragging respects the SVG scale even when the map has empty margins. Fixed a low-contrast research empty state identified by the accessibility suite.
4. **Faction and spacing correction.** Following the user's feedback, settlement and city walls, towers and roofs now carry the faction color, with darker shaded sides and outlines. The white building faces were removed. All sixteen faction/town combinations were reviewed together. Number labels were moved upward and the highest city's flag repositioned to leave more clearance around developed towns.

## Evidence

The final screenshots are in `test-artifacts/polish-final/`: desktop and laptop overviews, mobile and compact screens, a closer map view, developed city, all five action panels, the resource guide, campaign menu and miniature contact sheet. `scripts/polish-review.ts` creates isolated browser fixtures and screenshots; it never reads or overwrites a player's browser profile. `scripts/miniature-review.ts` renders the actual town and fleet components for comparison. Screenshots disable entrance animations so the review captures finished panels.

The final production browser suite passes **57 checks** across Chromium, Firefox and mobile Chromium. It covers the existing game workflows plus keyboard harbor inspection, pointer-anchored zoom, accurate dragging, large resource totals and separation of mobile action controls. The engine suite passes **116 tests**; production HTTP checks pass **12 tests**. See `TESTING.md` for logs and the earlier rule/AI verification.

At the full-map overview on a phone, individual hex labels are necessarily small. Zoom in or select a location and use the flag control to inspect it; Fit entire map restores the overview. The map is a pannable strategy board. Safari/WebKit and physical-device touch gestures have not been verified here.

Reproduce with the production server running:

```sh
npx tsx scripts/polish-review.ts
npx tsx scripts/miniature-review.ts
npm run test:e2e
```
