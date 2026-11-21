"""Run with python tests/browser-session.py (requires Playwright + Chromium)."""
import asyncio
import os
from pathlib import Path
import socket
import subprocess
import sys
import urllib.request


async def main():
    from playwright.async_api import async_playwright
    root = Path(__file__).resolve().parents[1]
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    env = dict(os.environ, PORT=str(port))
    server = subprocess.Popen(['node', 'serve.ts'], cwd=root, env=env, stdout=subprocess.DEVNULL)
    failures = []
    try:
        for _ in range(100):
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/game/', timeout=0.2):
                    break
            except Exception:
                await asyncio.sleep(0.1)
        else:
            raise RuntimeError('server did not become ready')
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            page = await browser.new_page(viewport={'width': 1280, 'height': 720})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.goto(f'http://127.0.0.1:{port}/game/', wait_until='networkidle')
            await page.get_by_role('button', name='New Game', exact=True).first.click()
            await page.wait_for_function("window.SF?.state?.mode === 'play'")
            print('PASS new game enters play')
            sample = """() => {
              const arms = SF.player.mesh.userData.arms;
              const list = Array.isArray(arms) ? arms : Object.values(arms);
              return list.map(a => { const r = (a.mesh || a).rotation; return r ? [r.x,r.y,r.z] : null; }).filter(Boolean);
            }"""
            await page.keyboard.down('KeyW')
            await page.wait_for_timeout(170)
            before = await page.evaluate(sample)
            await page.wait_for_timeout(190)
            after = await page.evaluate(sample)
            await page.keyboard.up('KeyW')
            delta = max((abs(a-b) for x, y in zip(before, after) for a, b in zip(x, y)), default=0)
            if delta > 0.001:
                print(f'PASS live arm swing delta {delta:.4f}')
            else:
                failures.append('arm swing'); print(f'FAIL live arm swing delta {delta:.4f}')
            # Place a real pedestrian and patrol in clear nearby space; inject no
            # wanted value and let the weapon/crime system observe the mouse input.
            evidence = await page.evaluate("""() => {
              const p = SF.player.mesh.position;
              const pools = [SF.peds?.list, SF.peds?.peds, SF.peds?.people, SF.peds?.all];
              const ped = pools.find(Array.isArray)?.find(x => x.mesh || x.position);
              if (ped) (ped.mesh?.position || ped.position).set(p.x, p.y, p.z - 7);
              SF.weapons.unlock('pistol'); SF.weapons.equip('pistol');
              const units = SF.police.units || [];
              for (const unit of units) {
                const mesh = unit.mesh || unit.vehicle?.mesh;
                if (mesh) { mesh.position.set(p.x + 9, p.y, p.z - 4); break; }
              }
              SF.input.yaw = 0; SF.input.pitch = 0;
              return {ped: !!ped, units: units.length};
            }""")
            await page.mouse.click(640, 360)
            await page.keyboard.press('Digit2')
            await page.mouse.down()
            await page.wait_for_timeout(1500)
            await page.mouse.up()
            wanted = await page.evaluate("""() => ({stars: Number(SF.police.stars ?? SF.police.wanted?.stars ?? SF.police.wanted ?? 0), units: SF.police.units.length})""")
            if evidence['ped'] and wanted['stars'] > 0 and wanted['units'] > 0:
                print(f'PASS witnessed crime response {wanted} witnesses={evidence}')
            else:
                failures.append('wanted response'); print(f'FAIL witnessed crime response {wanted} witnesses={evidence}')
            if errors:
                failures.append('browser errors'); print('FAIL browser errors: ' + ' | '.join(errors))
            else:
                print('PASS no browser exceptions')
            await browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
    return 1 if failures else 0


if __name__ == '__main__':
    try:
        sys.exit(asyncio.run(main()))
    except Exception as error:
        print('FAIL browser-session: ' + str(error))
        sys.exit(1)
