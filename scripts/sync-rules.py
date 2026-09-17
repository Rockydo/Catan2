"""Compatibility entry point for the bilingual rules exporter."""
import subprocess
from pathlib import Path
subprocess.run(["npm", "run", "docs"], cwd=Path(__file__).resolve().parent.parent, check=True)
