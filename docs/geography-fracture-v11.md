# Smaller regions and more divided worlds

Generation 11 changes the distribution and scale of existing formations rather than adding more names. New campaigns use three seeded structures: continental (18%), broken coasts (52%), and island seas (30%). These probabilities describe the selection of the world structure, not guaranteed percentages of land or ocean.

- **Smaller geographic provinces:** the province spacing falls from 24 to 11 hex coordinates. Most local formations are also about a quarter smaller, while great river basins and outwash plains retain their longer gradients.
- **Divided coastlines:** deformed crust blocks create connected straits, bays, islands and occasional land bridges in the physical elevation field. Climate and resource draws still happen afterward. Islands do not appear through independent random water rolls.
- **Connected mountains:** curved ridges extend across province borders, with localized saddles. Bare peaks strongly favor ridge crests; broad elevated land no longer receives scattered peaks solely for being high. Passes retain their two-peak and separation requirements.
- **Smaller climate regions:** temperature and moisture fields vary on a scale of 7 rather than 11; climate continuation falls from 88% to 74%. Neighbor compatibility remains mandatory, preserving transitional climates rather than directly joining incompatible extremes.
- **Some large worlds remain:** continental seeds retain large catchments and broad landmasses. Broken coast worlds mix islands, peninsulas and larger connected land; island seas favor smaller land groups.

## Comparison

A fixed survey of 32 Grand Campaign seeds (`fracture-survey-0` through `fracture-survey-31`), each with 320 tiles, gave these averages during tuning:

| Measure | Generation 10 | Generation 11 |
|---|---:|---:|
| Land tiles, including peaks | 215 | 201 |
| Largest connected landmass | 184 | 98 |
| Small islands containing 2–35 land tiles | 1.2 | 6.0 |
| Largest connected land climate patch | 70 | 29 |
| Different climates on land | 9.7 | 11.8 |
| Longest connected chain of bare peaks | 2.9 | 8.8 |
| River tiles | 17.4 | 15.8 |

These are measurements from the named sample, not per-map quotas. Different islands can still share a climate; water and peaks can separate otherwise similar regions. Marine area changes only modestly: fragmentation accounts for much of the difference.

Existing campaigns retain their original generation and climate continuation rules, including later expeditions. A new campaign is needed to see generation 11. The new shape calculations inspect a fixed local neighborhood and do not add work to normal game turns.
