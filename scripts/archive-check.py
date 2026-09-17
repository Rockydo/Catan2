"""Boot the extracted release without installing its dependencies."""
from pathlib import Path
import json, os, socket, subprocess, tempfile, time, urllib.request, zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
archive = root / 'releases' / f"catane-frontiers-v{'.'.join(version.split('.')[:2])}.zip"
with tempfile.TemporaryDirectory(prefix='catane-release-') as temporary:
    with zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None
        bundle.extractall(temporary)
    game = Path(temporary) / 'catane-game'
    assert not (game / 'node_modules').exists()
    assert json.loads((game / 'package.json').read_text())['version'] == version
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    process = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=game,
                               env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1'},
                               stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    try:
        for attempt in range(50):
            try:
                with urllib.request.urlopen(base, timeout=1) as response:
                    assert response.status == 200
                    break
            except OSError:
                if process.poll() is not None:
                    raise RuntimeError(process.stderr.read().decode())
                time.sleep(.1)
        else:
            raise RuntimeError('Extracted server did not become ready')
        paths = ['/rules.html', '/rules-fr.html', '/assets/terrain-atlas-v2.png', '/assets/frontiers-cover.png', '/assets/unit-roster.png', '/assets/unit-tier-2.png', '/assets/terrain-whale-v1.png']
        for path in paths:
            with urllib.request.urlopen(base + path) as response:
                assert response.status == 200 and len(response.read()) > 100
        result = subprocess.run(['node', '--input-type=module', '-e', r'''
import {chromium,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
const browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,args:['--no-sandbox']});
try {
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.CATANE_ARCHIVE_URL);
 await page.getByRole('button',{name:/New campaign/}).click();
 await page.getByLabel('World seed').fill('archive-check');
 await page.getByRole('button',{name:'Found your realm'}).click();
 await page.getByRole('button',{name:/begin/}).click();
 await expect(page.locator('[data-testid^="hex-"]')).toHaveCount(110);
 await page.locator('[data-testid^="settlement-target-"]').first().click();
 await page.locator('[data-testid^="edge-target-"]').first().click();
 await expect(page.locator('[data-testid^="town-"]')).toHaveCount(9,{timeout:30000});
 if(errors.length)throw new Error(errors.join('\n'));
 console.log(JSON.stringify({campaignStarted:true,workerSetup:true,tiles:110,browserErrors:errors}));
} finally {await browser.close();}
'''], cwd=root, env={**os.environ, 'CATANE_ARCHIVE_URL': base}, capture_output=True, text=True, timeout=60)
        if result.returncode:
            raise RuntimeError(result.stderr + result.stdout)
        report = {'archive': archive.name, 'version': version, 'noInstalledDependencies': True,
                  'assetPaths': paths, **json.loads(result.stdout)}
    finally:
        process.terminate()
        process.wait(timeout=10)
(root / 'test-artifacts' / f'v{version.split(".")[0]}{version.split(".")[1]}-archive-check.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
