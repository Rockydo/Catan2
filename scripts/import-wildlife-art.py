"""Crop generated landscape edits into lightweight runtime textures."""
from PIL import Image
from pathlib import Path
import json, hashlib
root=Path(__file__).resolve().parents[1]
batches=json.loads((root/'output/wildlife-art/batches.json').read_text())
manifest={}; provenance=[]
folder=root/'public/assets/wildlife-terrain';folder.mkdir(exist_ok=True)
for batch in batches:
    path=root/'output/wildlife-art'/f"{batch['name']}-generated.png"
    image=Image.open(path).convert('RGB');w,h=image.size
    for i,cell in enumerate(batch['cells']):
        kind=batch['kind']; source=cell['file']; key=f'{kind}/{source}'
        name=f"{kind}-{hashlib.sha256(source.encode()).hexdigest()[:12]}"
        box=(round(i%4*w/4),round(i//4*h/4),round((i%4+1)*w/4),round((i//4+1)*h/4))
        image.crop(box).save(folder/f'{name}.webp',quality=88,method=6)
        manifest[key]=name
        provenance.append({'asset':f'{name}.webp','base':source,'kind':kind,'atlas':batch['name'],'cell':i,'habitats':cell.get('habitats',[])})
(root/'src/ui/wildlife-terrain-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(folder/'provenance.json').write_text(json.dumps({'method':'ImageGen reference edits, 4x4 atlases, cropped to individual full terrain paintings. No animal sprite compositing.','constraints':'Retain each base landscape, season and perspective; natural ground contact, shadows and foreground occlusion. Empty variants remove all wildlife.','assets':provenance},indent=2)+'\n')
print(len(manifest),'terrain variants;',sum(f.stat().st_size for f in folder.glob('*.webp')),'bytes')
