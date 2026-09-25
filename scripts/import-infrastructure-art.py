"""Package reviewed local-Qwen candidates; never alias or merge source art.

Usage: python3 scripts/import-infrastructure-art.py --reviewed job.json ...
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("--reviewed", nargs="+", type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
assets = root / "public/assets"
destination = assets / "infrastructure"
manifest_path = root / "src/ui/infrastructure-art-manifest.json"
provenance_path = root / "docs/infrastructure-art-provenance.json"
manifest = json.loads(manifest_path.read_text())
provenance = json.loads(provenance_path.read_text()) if provenance_path.exists() else {}
jobs = []
for job_path in args.reviewed:
    job = json.loads(job_path.read_text())
    image = root / job["output"]
    record = json.loads(image.with_suffix(".json").read_text())
    source = Path(record["job"]["source"])
    source_key = source.relative_to(assets).as_posix()
    if source_key != job["source_key"]:
        raise ValueError("Reviewed image belongs to a different source")
    if hashlib.sha256(source.read_bytes()).hexdigest() != record["source_sha256"]:
        raise ValueError(f"Source changed since generation: {source}")
    if record["status"]["status_str"] != "success" or not image.exists():
        raise ValueError("Candidate did not finish successfully")
    if job["level"] not in [1, 2, 3] or Path(job["asset"]).name != job["asset"]:
        raise ValueError("Invalid development level or asset name")
    jobs.append((job, image, record, source_key))
existing = {p.name for p in destination.iterdir() if p.suffix.lower() in [".webp", ".png", ".jpg", ".jpeg"]}
if len(existing | {f'{job["asset"]}.webp' for job, _, _, _ in jobs}) > 1000:
    raise ValueError("Import would exceed the 1,000-image ceiling")
for job, image, record, source_key in jobs:
    target = destination / (job["asset"] + ".webp")
    subprocess.run(["magick", str(image), "-resize", "512x512", "-alpha", "off", "-strip", "-quality", "86", str(target)], check=True)
    manifest.setdefault(source_key, {})[str(job["level"])] = job["asset"]
    provenance[job["asset"]] = {
        "source": source_key, "source_sha256": record["source_sha256"],
        "model": record["model"], "level": job["level"],
        "prompt": record["job"]["prompt"],
        "settings": record["graph"]["7"]["inputs"],
        "referenceResolution": record["graph"]["5"]["inputs"]["resolution"],
        "textEncoder": record["graph"]["2"]["inputs"]["clip_name"],
        "diffusionModel": record["graph"]["1"]["inputs"]["unet_name"],
    }
manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
provenance_path.write_text(json.dumps(provenance, indent=2, sort_keys=True) + "\n")
print(f"Imported {len(jobs)} reviewed exact-source paintings")
