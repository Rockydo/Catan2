# Living geography implementation

Authorized scope: coherent continental/island/basin geography; water-hex rivers and climate-dependent crossings; fertile river-only terrains, floodplains and deltas; seasonal mountain passes with permanent peaks and no mountain engineering; shallow/deep seas, reefs and appropriate ships; broad regional weather with a readable map view; persistent migrating fish/whales/wild game responsive to development; sedentary farms and timber-producing empty forests; four-tier hunters; bridges, irrigation, harbors and constrained development; harvest risk management and economic disruption; rare functional landmarks; complete AI, saves, art, English/French documentation and verification.

Excluded: winds, commercial trade networks, arbitrary terraforming, permanent mountain crossings, upkeep, extinction and per-tile weather micromanagement.

Architecture decisions:

- Geography version 1 extends generation 5 for new five- and twelve-faction campaigns. Existing settlements, resources and terrain survive loading old saves; geography starts with new campaigns, with explicit legacy support.
- Stateless, seeded correlated height fields and downhill drainage reserve geometry independently of reveal order. Climate reservations remain compatible and authoritative for resources.
- Permanent terrain and temporary access are separate. River beds remain water. Flooded land remains construction ground where allowed. Peaks never open.
- Regional weather updates at half-season boundaries. Migration populations persist, cannot be harvested away, move only through suitable connected revealed habitat and penalize development without zeroing suitability.
- Existing resource cards and recipes remain; new terrains use existing goods. Map overlays explain movement, weather and wildlife. Ordinary map uses compact artwork and sparse indicators.
- All gameplay changes must use authoritative engine validation, not UI-only restrictions. Saves validate new fields and roundtrip compact packing.

Status: engine, AI, UI, save support, illustrated assets and bilingual rules implemented. Verified with 1,911 tests in the full suite, additional geography/art tests, English/French browser checks on Chromium, Firefox and mobile, two 32-round standard simulations and a 24-round twelve-faction simulation (7,567 actions). Final targeted checks cover the subsequent forecast and art refinements. Existing saves keep their terrain and production rules.

## Geography revision 3

New worlds blend ten climate-associated landforms, use shorter island catchments and additional wet mainland headwaters, and grow small basins toward 3–10 hexes with the existing 12-hex lake cap. The ocean-area target is reduced by one quarter, saltwater wildlife density increases by one third, and Grand Campaign starts with 12 factions on 320 tiles. Previous world versions retain their physical terrain and drainage.

River headwaters occupy more of their hex. River mouths use full water-facing edges without false bank islands. All floodable terrain preserves its own seasonal artwork under floodwater. A floodplain overlay and bilingual inspector explain levels, raw and processed production losses, and levee protection. Polar cold/mild spells affect thaw-driven water levels; Glacial floods peak in summer.

Cold habitat species selection includes reindeer, musk ox and suitable coastal seals. Empty ranges use habitat names. Land herds may traverse short nearshore ice crossings but end on land. Sea ice odds use surrounding ocean exposure, with open nonpolar ocean protected from freezing outside winter cold spells. Player forecasts and AI use the same odds. Mountain interiors reject roads between peaks/passes, including setup/free roads. Steppe and Prairie grassland weights increase at the expense of stone, coal and clay.

Validation: 1,952 unit and integration tests passed. Chromium and Firefox checks cover connected water, all 793 channel/coast masks, large-map canvas rendering, campaign creation and bilingual rules. An eight-round, twelve-faction simulation completed 1,580 valid actions, including two expeditions, 44 battles, sieges and terrain repairs. Additional checks cover flood inspector selection and wet/dry rulebook previews. The accelerated terrain renderer now handles inherited clip paths, including even-odd clips, so flooding does not force a slow SVG fallback.
