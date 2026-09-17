"""Package a built game with editable sources, without private saves or test runs."""
from pathlib import Path
import hashlib, json, zipfile
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'package.json').read_text())['version']
release=root/'releases'
release.mkdir(exist_ok=True)
output=release/f"catane-frontiers-v{'.'.join(version.split('.')[:2])}.zip"
folders=['src','public','dist','scripts','tests','e2e','docs','.github']
files=['package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','index.html','rules.html','rules-fr.html','.gitignore','launch.sh','launch.cmd','README.md','LOCALIZATION.md','TESTING.md','ART.md','THIRD_PARTY_NOTICES.md']
assert (root/'dist/index.html').exists(), 'Run npm run build first'
paths=[root/f for f in files]
for folder in folders:
 paths.extend(p for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(set(paths)): z.write(p,Path('catane-game')/p.relative_to(root))
with zipfile.ZipFile(output) as z: assert z.testzip() is None
sha=hashlib.sha256(output.read_bytes()).hexdigest()
(release/'SHA256SUMS').write_text(f'{sha}  {output.name}\n')
print(json.dumps({'archive':str(output),'bytes':output.stat().st_size,'sha256':sha,'files':len(paths)},indent=2))
