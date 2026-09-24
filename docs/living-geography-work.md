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
