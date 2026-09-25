"""Serial local Qwen Image 2.1 edits. Outputs candidates, never publishes art.

Start the user's RAM-safe ComfyUI launcher first. Pass a JSON job containing
source, prompt, output, and optional seed/steps/resolution. Review each result.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import time
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("job", type=Path)
parser.add_argument("--comfy", type=Path, default=Path.home() / "ai/ComfyUI")
args = parser.parse_args()
job = json.loads(args.job.read_text())
endpoint = "http://127.0.0.1:8188"


def api(path, data=None):
    request = urllib.request.Request(endpoint + path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read()
        return json.loads(body) if body else {}


def available():
    for line in Path("/proc/meminfo").read_text().splitlines():
        if line.startswith("MemAvailable:"):
            return int(line.split()[1]) / 1024 / 1024
    raise RuntimeError("Cannot verify available RAM")


if available() < 16:
    raise RuntimeError("Need at least 16 GiB available before submission")
queue = api("/queue")
if queue["queue_running"] or queue["queue_pending"]:
    raise RuntimeError("Another job is queued or running; do not overlap inference")
source = Path(job["source"]).resolve()
fingerprint = hashlib.sha256(source.read_bytes()).hexdigest()
reference = f"catane-development-{fingerprint[:16]}{source.suffix}"
shutil.copy2(source, args.comfy / "input" / reference)
negative = "text, labels, icons, border, changed camera, close-up, changed season, changed crop, oversized buildings, collage, photograph, giant factory"
graph = {
    "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "qwen_image_2.1_bf16.safetensors", "weight_dtype": "default"}},
    "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen3vl_8b_int8_convrot.safetensors", "type": "qwen_image", "device": "default"}},
    "3": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_2.1_vae_bf16.safetensors"}},
    "4": {"class_type": "LoadImage", "inputs": {"image": reference}},
    "5": {"class_type": "TextEncodeQwenImage21", "inputs": {"clip": ["2", 0], "vae": ["3", 0], "prompt": job["prompt"], "negative_prompt": negative, "resolution": job.get("resolution", 512), "images.image_1": ["4", 0]}},
    "6": {"class_type": "QwenImage21Cache", "inputs": {"model": ["1", 0], "device": "gpu", "dtype": "default"}},
    "7": {"class_type": "KSampler", "inputs": {"model": ["6", 0], "positive": ["5", 0], "negative": ["5", 1], "latent_image": ["5", 2], "seed": job.get("seed", 250925), "steps": job.get("steps", 28), "cfg": 4, "sampler_name": "euler", "scheduler": "simple", "denoise": 1}},
    "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
    "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "catane-development/candidate"}},
}
output = Path(job["output"])
if output.exists():
    raise RuntimeError(f"Refusing to overwrite {output}")
output.parent.mkdir(parents=True, exist_ok=True)
result = api("/prompt", {"prompt": graph, "client_id": "catane-infrastructure-art"})
prompt_id = result["prompt_id"]
record = {"model": "Qwen Image 2.1 local", "source_sha256": fingerprint, "job": job, "graph": graph, "prompt_id": prompt_id}
output.with_suffix(".json").write_text(json.dumps(record, indent=2) + "\n")
print(f"Submitted {prompt_id}, {available():.1f} GiB available", flush=True)
started = time.monotonic()
while time.monotonic() - started < 900:
    if available() < 13.5:
        api("/interrupt", {})
        api("/free", {"unload_models": True, "free_memory": True})
        raise RuntimeError("Stopped our edit before crossing the 12 GiB RAM reserve")
    history = api(f"/history/{prompt_id}").get(prompt_id)
    if history:
        record["status"] = history["status"]
        output.with_suffix(".json").write_text(json.dumps(record, indent=2) + "\n")
        if history["status"]["status_str"] != "success":
            raise RuntimeError(json.dumps(history["status"]))
        image = history["outputs"]["9"]["images"][0]
        shutil.copy2(args.comfy / "output" / image["subfolder"] / image["filename"], output)
        print(f"Saved {output}; {time.monotonic() - started:.1f}s; {available():.1f} GiB available", flush=True)
        break
    time.sleep(2)
else:
    api("/interrupt", {})
    raise RuntimeError("Edit exceeded 15 minutes; interrupted our job")
