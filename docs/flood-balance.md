# River and flood balance

Floods are local conditions, not a penalty applied to every river neighbor. A marked low basin floods at water level 3; a higher bank requires 4. Rugged terrain never floods. New low basins must be within 0.025 elevation of the adjacent river or lake and have at most 0.08 local relief. Existing banks without a saved threshold default to 4.

Temperate spring baseline falls from 3 to 2. Ordinary tropical and subtropical high water peaks at 2; monsoon summer still peaks at 3. Steppe has a modest spring peak. Mediterranean and oceanic regions peak in winter, while polar snowmelt follows the local spring/summer thaw. Wet weather can still produce floods. Desert storms add 3 levels but occur only 10% of seasons, so flash floods are episodic rather than a routine spring event.

Production still stops on an actually flooded tile. Buildings and stocks survive. Levees protect their tile; irrigation and bridges do not. AI forecasts use the same threshold and climate-specific weather probabilities as actual flooding. The tile panel shows the local threshold and lost production, and flooded riverbank sectors match adjacent land.

Tests cover thresholds, climate calendars, levees, forecasts, old-save repairs and riverbank rendering inputs. A representative higher-bank Alluvial wheat comparison retains at least 65% of its seasonal annual grain potential in each tested climate before dice, weather multipliers and producer bonuses. This is a bounded balance check, not a claim that every crop or low basin has equal profitability. Reliable high banks and richer but risky low basins create different settlement choices.

## Real-world basis

The calendars represent broad climate patterns. Hex elevations, levels, weather weights and output modifiers are game design values, not measured hydrological probabilities. A single regional calendar cannot represent every real river basin.

- [USGS: Snowmelt runoff](https://www.usgs.gov/water-science-school/science/snowmelt-runoff-and-water-cycle): seasonal snowmelt, rapid warming and rain can raise river flow and cause flooding.
- [US National Weather Service: Monsoon flash floods](https://www.weather.gov/abq/northamericanmonsoon-flashfloods): intense rain can cause sudden floods in normally dry channels.
- [Met Office: Climate zones](https://weather.metoffice.gov.uk/climate/climate-explained/climate-zones): Mediterranean winter rain and summer dryness differ from tropical and polar cycles.
- [Met Office: Rainy seasons](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/rain/rainy-seasons): tropical wet seasons vary with regional rainfall regimes; they are not a universal spring event.
