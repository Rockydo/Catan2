# English and French

The language selector is on the opening screen and in campaign settings. It saves `catane-language` separately from the campaign. If no choice is saved, French browsers start in French and other browsers start in English.

Only displayed text is translated. Engine identifiers, commands, resource counts, world generation, random streams and save formats keep their existing values. Player and town names are retained. Older English event records are translated when displayed.

## Terminology

Base-game terms follow the official French publisher rulebooks:

- [Catan rules](https://cdn.svc.asmodee.net/production-asmodeeca/uploads/2025/11/CATAN-REGLES.pdf)
- [Marins rules](https://cdn.svc.asmodee.net/production-asmodeeca/uploads/2025/11/CATAN-MARINS-REGLES.pdf)

| English | French |
|---|---|
| Wood | Bois |
| Clay | Argile |
| Wool | Laine |
| Grain | Blé |
| Iron ore | Minerai |
| Settlement | Colonie |
| City | Ville |
| Road | Route |
| Development / Research | Développement |
| Road Building | Construction de routes |

Moving fleets use *navire* to distinguish them from stationary *bateaux de liaison* and *routes maritimes*. New systems have their own French names. No official rulebook text or artwork is reproduced.

## Editing translations

Game-facing source text remains English. Components call `localize` from `src/i18n`, with exact translations and numbered dynamic placeholders in `src/i18n/fr.json`. Do not translate command IDs, resource IDs, CSS classes or saved data. Preserve every numbered placeholder. Components that need to update on a language change subscribe with `useLocale`.

The rulebook uses paired English and French chapters in `src/rules/chapters.json`. Its catalogues import live game data. After editing, run `npm run docs` to regenerate both complete Markdown references. Add new game labels and effects to the French dictionary as well.

Map labels use bundled vector glyphs rather than browser text rasterization. French accents and ligatures are included in `src/ui/map-font.json`. To regenerate it, install Python's `fonttools` package and run `python scripts/build-map-font.py`; its source font is Noto Sans Bold, as documented in the script and font notice.

Run `npm test` and the browser localization tests after changes. The tests cover catalogue translations, placeholder preservation, French glyphs, language switching without changing the save, and both rulebook languages.
