"""Split approved four-season terrain sheets into the game's WebP assets.

Usage: python scripts/import-frontier-art.py /path/to/sheets
The folder must contain the six named PNG sheets in frontier-climates-prompts.json.
This only crops and encodes generated art; it does not synthesize seasonal variants.
"""
from pathlib import Path
import json
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHEETS = [
    ("tundra", "tundra-life", ["tundra-heath", "musk-ox-range", "reindeer-range", "peat-bog"]),
    ("tundra", "tundra-minerals", ["arctic-iron", "arctic-stone", "arctic-gold", "snow-plain"]),
    ("temperate-rainforest", "rainforest-life", ["old-growth-forest", "fern-hunting-grounds", "coastal-pasture", "peat-bog"]),
    ("temperate-rainforest", "rainforest-minerals", ["alluvial-clay", "coastal-cliffs", "iron", "gold"]),
    ("equatorial-wetlands", "wetlands-life", ["mangrove", "sago-grove", "river-woods", "alluvial-clay"]),
    ("equatorial-wetlands", "wetlands-minerals", ["peat-bog", "stone", "iron", "gold"]),
]
SEASONS = ["spring", "summer", "autumn", "winter"]
DEST = ROOT / "public/assets/seasons"
manifest_path = ROOT / "src/ui/season-art-manifest.json"
manifest = json.loads(manifest_path.read_text())
new_biomes = {"tundra-heath", "musk-ox-range", "peat-bog", "old-growth-forest", "fern-hunting-grounds", "mangrove", "sago-grove"}
base_written = set()
for climate, name, biomes in SHEETS:
    source = Image.open(Path(sys.argv[1]) / f"{name}.png").convert("RGB")
    width, height = source.size
    for row, biome in enumerate(biomes):
        for col, season in enumerate(SEASONS):
            # A two-pixel inset excludes incidental seams at sheet boundaries.
            box = (round(col * width / 4) + 2, round(row * height / 4) + 2,
                   round((col + 1) * width / 4) - 2, round((row + 1) * height / 4) - 2)
            tile = source.crop(box).resize((384, 384), Image.Resampling.LANCZOS)
            filename = f"{climate}-{biome}-{season}.webp"
            tile.save(DEST / filename, quality=88, method=6)
            manifest["tiles"][f"{climate}/{biome}/{season}"] = filename
            if biome in new_biomes and biome not in base_written and season == "summer":
                tile.save(ROOT / f"public/assets/terrain-{biome}-v1.webp", quality=88, method=6)
                base_written.add(biome)

# Existing sea families already match these coastal environments and keep the
# quieter sea presentation. Tundra gets full frozen-water art as well.
for climate, source, biomes in [
    ("tundra", "arctic", ["water", "fish", "cod", "whale", "ice"]),
    ("temperate-rainforest", "oceanic", ["water", "fish", "cod", "whale"]),
    ("equatorial-wetlands", "tropical", ["water", "fish", "whale"]),
]:
    for biome in biomes:
        for season in SEASONS:
            manifest["tiles"][f"{climate}/{biome}/{season}"] = manifest["tiles"][f"{source}/{biome}/{season}"]

text = json.dumps(manifest, indent=2) + "\n"
manifest_path.write_text(text)
(DEST / "manifest.json").write_text(text)
print("Imported 96 seasonal terrain images, 7 base images, and 48 sea references.")
