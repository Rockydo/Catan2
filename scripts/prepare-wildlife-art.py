"""Assemble existing terrain references. No wildlife is composited here."""
from PIL import Image
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
variants=json.loads(Path('/tmp/wildlife-art-inventory.json').read_text())
# Empty habitat edits remove animals already baked into older terrain art.
files=dict.fromkeys(v['file'] for v in variants)
variants += [{'kind':'empty','file':f,'habitats':[]} for f in files]
batches=[]
(root/'output/wildlife-art').mkdir(parents=True,exist_ok=True)
for kind in dict.fromkeys(v['kind'] for v in variants):
    entries=[v for v in variants if v['kind']==kind]
    for start in range(0,len(entries),16):
        cells=entries[start:start+16]
        name=f'{kind}-{start//16+1}'
        atlas=Image.new('RGB',(1536,1536))
        for i in range(16):
            file=cells[i % len(cells)]['file']
            image=Image.open(root/'public/assets'/file).convert('RGB').resize((384,384),Image.Resampling.LANCZOS)
            atlas.paste(image,((i%4)*384,(i//4)*384))
        ref=root/'output/wildlife-art'/f'{name}-reference.png'
        atlas.save(ref)
        batches.append({'name':name,'kind':kind,'reference':str(ref),'cells':cells})
(root/'output/wildlife-art/batches.json').write_text(json.dumps(batches,indent=2))
print([(b['name'],len(b['cells'])) for b in batches])
