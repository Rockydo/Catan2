"""Build small vector label data. Requires fonttools; no runtime font dependency."""
from pathlib import Path
import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
font = TTFont(sys.argv[1] if len(sys.argv) > 1 else '/usr/share/fonts/noto/NotoSans-Bold.ttf')
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
class Outline(BasePen):
    def __init__(self): super().__init__(glyphs); self.commands=[]
    def emit(self, command, *points): self.commands.append([command, *[round(v, 3) for p in points for v in p]])
    def _moveTo(self,p): self.emit('M',p)
    def _lineTo(self,p): self.emit('L',p)
    def _curveToOne(self,a,b,c): self.emit('C',a,b,c)
    def _qCurveToOne(self,a,b): self.emit('Q',a,b)
    def _closePath(self): self.emit('Z')
    def _endPath(self): pass
out={}
for char in ''.join(chr(i) for i in range(32,127)) + 'ÀÂÄÆÇÉÈÊËÎÏÔÖŒÙÛÜŸàâäæçéèêëîïôöœùûüÿ’:–−':
    name=cmap[ord(char)]; pen=Outline(); glyphs[name].draw(pen)
    out[char]={'advance':font['hmtx'][name][0], 'commands':pen.commands}
root=Path(__file__).resolve().parent.parent
(root/'src/ui/map-font.json').write_text(json.dumps({'em':font['head'].unitsPerEm,'glyphs':out},separators=(',',':'))+'\n')
print('Generated',len(out),'glyphs from',font['name'].getDebugName(1))
