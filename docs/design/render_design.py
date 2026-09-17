"""Small dependency-free renderer for this document's Markdown subset."""
from pathlib import Path
import base64
import html
import re

ROOT = Path(__file__).resolve().parent


def inline(text):
    text = html.escape(text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', text)
    return re.sub(r'`([^`]+)`', r'<code>\1</code>', text)


def main():
    source = (ROOT / 'DESIGN.md').read_text().splitlines()
    blocks, toc = [], []
    i = 0
    while i < len(source):
        line = source[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith('# '):
            blocks.append('<h1>' + inline(line[2:]) + '</h1>')
        elif re.match(r'^\*\*\d+\.', line):
            title = line.strip('*')
            anchor = 'section-' + title.split('.')[0]
            toc.append((anchor, title))
            blocks.append(f'<h2 id="{anchor}">{inline(title)}</h2>')
        elif line.startswith('```'):
            code = []
            i += 1
            while i < len(source) and not source[i].startswith('```'):
                code.append(source[i])
                i += 1
            blocks.append('<pre><code>' + html.escape('\n'.join(code)) + '</code></pre>')
        elif line.startswith('|'):
            rows = []
            while i < len(source) and source[i].startswith('|'):
                cells = [c.strip() for c in source[i].strip('|').split('|')]
                if not all(re.fullmatch(r'[:\- ]+', c) for c in cells):
                    tag = 'th' if not rows else 'td'
                    rows.append('<tr>' + ''.join(f'<{tag}>{inline(c)}</{tag}>' for c in cells) + '</tr>')
                i += 1
            blocks.append('<div class="table-wrap"><table><thead>' + rows[0] + '</thead><tbody>' + ''.join(rows[1:]) + '</tbody></table></div>')
            continue
        elif re.match(r'^(?:- |\d+\. )', line):
            ordered = bool(re.match(r'^\d+\. ', line))
            tag = 'ol' if ordered else 'ul'
            items = []
            pattern = r'^\d+\. ' if ordered else r'^- '
            while i < len(source) and re.match(pattern, source[i]):
                items.append('<li>' + inline(re.sub(pattern, '', source[i])) + '</li>')
                i += 1
            blocks.append(f'<{tag}>' + ''.join(items) + f'</{tag}>')
            continue
        else:
            blocks.append('<p>' + inline(line) + '</p>')
        i += 1
    artwork = ROOT / 'assets' / 'unit-roster.png'
    art_html = ''
    if artwork.exists():
        data = base64.b64encode(artwork.read_bytes()).decode()
        art_html = '<figure id="unit-art"><img alt="Twelve unit concepts: three tiers each of heavy infantry, light infantry, cavalry and artillery" src="data:image/png;base64,' + data + '"><figcaption>Original unit concept roster · built-in image generation · artwork is illustrative; the written rules define mechanics.</figcaption></figure>'
        index = next(i for i, block in enumerate(blocks) if 'id="section-8"' in block)
        blocks.insert(index, art_html)
    css = '''
:root { color-scheme: light; --ink:#24342f; --muted:#63766b; --green:#225946; --paper:#faf8f1; --line:#d9ded3; }
* { box-sizing:border-box; } html { scroll-behavior:smooth; } body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.7 Georgia,serif; }
aside { position:fixed; width:270px; height:100vh; overflow:auto; background:#183d32; color:#edf1e7; padding:30px 24px; font:13px/1.45 system-ui,sans-serif; }
aside b { display:block; letter-spacing:.15em; text-transform:uppercase; color:#dfc583; font-size:11px; margin-bottom:20px; }
aside a { display:block; color:inherit; text-decoration:none; padding:8px 0; border-bottom:1px solid #ffffff18; }
main { margin-left:270px; max-width:1230px; padding:60px 58px 120px; }
h1 { font-size:clamp(38px,5vw,62px); line-height:1.05; letter-spacing:-.04em; color:var(--green); margin:0 0 18px; }
h2 { font:700 27px/1.25 system-ui,sans-serif; color:var(--green); margin:64px 0 24px; padding-top:20px; border-top:2px solid var(--line); scroll-margin-top:20px; }
p { margin:18px 0; } strong { color:#173e30; } a { color:#166749; text-underline-offset:3px; } li { padding-left:4px; margin:9px 0; }
.table-wrap { overflow:auto; margin:25px 0; border:1px solid var(--line); border-radius:6px; }
table { border-collapse:collapse; width:100%; font:14px/1.5 system-ui,sans-serif; } th { background:#e7ede2; text-align:left; color:#244a39; font-weight:650; } td,th { padding:12px 14px; vertical-align:top; border-bottom:1px solid var(--line); } tr:last-child td { border-bottom:0; } tbody tr:nth-child(even) { background:#f1f3eb; }
code { font:13px/1.6 ui-monospace,monospace; background:#eaf0e5; padding:2px 4px; } pre { overflow:auto; background:#eaf0e5; padding:22px; border-left:4px solid #9bab7c; } pre code { padding:0; }
figure { margin:40px 0; } figure img { width:100%; border-radius:8px; } figcaption { font:12px/1.5 system-ui,sans-serif; color:var(--muted); margin-top:10px; }
.print { margin:22px 0 0; border:1px solid #adbdab; background:transparent; color:inherit; padding:8px 14px; cursor:pointer; }
@media(max-width:950px) { aside { position:static; width:auto; height:auto; } aside nav { columns:2; } main { margin:0; padding:35px 24px 70px; } }
@media(max-width:550px) { aside nav { columns:1; } main { padding:30px 17px; } th,td { min-width:135px; } }
@media print { aside { display:none; } main { margin:0; max-width:none; padding:0; } body { font-size:10pt; } h1 { font-size:30pt; } h2 { font-size:17pt; break-after:avoid; margin-top:25px; } .table-wrap { overflow:visible; } table { font-size:8pt; } tr { break-inside:avoid; } figure { break-inside:avoid; } a { color:inherit; } }
'''
    nav = ''.join(f'<a href="#{anchor}">{html.escape(title)}</a>' for anchor, title in toc)
    page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Catane: Frontiers : Rules & Design v2.6</title><style>' + css + '</style></head><body><aside><b>Rules & design · v2.6</b><nav>' + nav + '</nav><button class="print" onclick="window.print()">Print / save PDF</button></aside><main>' + '\n'.join(blocks) + '</main></body></html>'
    (ROOT / 'Catane-Frontiers.html').write_text(page)
    print('Rendered', len(toc), 'sections; embedded unit art:', bool(art_html))


if __name__ == '__main__':
    main()
