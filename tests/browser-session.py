import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

async def run_browser():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        page = await browser.new_page(viewport={'width':1280,'height':720}, device_scale_factor=1)
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: print('BROWSER',m.type,m.text) if m.type in ('warning','error') else None)
        await page.goto('http://127.0.0.1:4175/game/index.html', wait_until='networkidle')
        await page.wait_for_function('window.SF?.render?.scene && window.SF?.main?.state.booted', timeout=120000)
        await page.wait_for_timeout(500)
        print(await page.evaluate('JSON.stringify({SF:!!window.SF,foundation:!!window.Sunfall?.app,canvases:document.querySelectorAll("canvas").length})'))
        if len(sys.argv)>1 and sys.argv[1] in ('play','capture'):
            await page.get_by_role('button', name='New Game', exact=True).click()
            await page.wait_for_timeout(1000)
            if sys.argv[1]=='play':
                await page.keyboard.down('w')
                await page.wait_for_timeout(200)
                a=await page.evaluate('({pos:SF.player.position.toArray(),arms:SF.player.mesh.userData.arms.map(a=>a.rotation.x)})')
                await page.wait_for_timeout(230)
                b=await page.evaluate('({pos:SF.player.position.toArray(),arms:SF.player.mesh.userData.arms.map(a=>a.rotation.x)})')
                await page.keyboard.up('w')
                assert a['arms']!=b['arms'] and a['pos']!=b['pos'], (a,b)
                print('WALK',json.dumps([a,b]))
                await page.keyboard.press('e')
                await page.wait_for_function('SF.missions.active.stage===1',timeout=20000)
                print('MISSION',await page.evaluate('JSON.stringify({stage:SF.missions.active.stage,banner:SF.hud.elements.banner.textContent})'))
                assert await page.evaluate('SF.missions.active.stage===1')
                assert await page.evaluate("SF.hud.elements.tracker.textContent.includes('2 / 4')")
                await page.evaluate('SF.player.mesh.position.copy(SF.vehicles.doorPoints(SF.vehicles.instances.find(c=>!c.locked && !c.driver))[0])')
                await page.keyboard.down('f')
                await page.wait_for_function('!!SF.player.car',timeout=20000)
                await page.keyboard.up('f')
                assert await page.evaluate('!!SF.player.car')
                start=await page.evaluate('SF.player.position.toArray()')
                await page.keyboard.down('w')
                await page.wait_for_function('(start)=>SF.player.position.distanceTo(new THREE.Vector3(...start))>3',arg=start,timeout=45000)
                await page.keyboard.up('w')
                end=await page.evaluate('SF.player.position.toArray()')
                assert start!=end
                print('DRIVE',json.dumps([start,end]))
                await page.evaluate('SF.player.car.speed=0;SF.player.exit(true);SF.player.mesh.position.set(-224,.24,-225)')
                await page.wait_for_timeout(1200)
                # Face a live nearby patrol and fire using real input.
                await page.evaluate('''() => { const u=SF.police.patrols[0]; if(!u)throw Error('No ambient patrol'); SF.player.mesh.position.copy(u.car.mesh.position).add(new THREE.Vector3(0,0,5)); }''')
                await page.keyboard.down('2')
                await page.wait_for_function("SF.weapons.equipped==='pistol'",timeout=20000)
                await page.keyboard.up('2')
                await page.mouse.down()
                await page.wait_for_function('SF.police.stars>0',timeout=20000)
                await page.mouse.up()
                crime=await page.evaluate('({stars:SF.police.stars,heat:SF.police.heat,patrols:SF.police.patrols.length,hud:SF.hud.elements.stars.textContent})')
                assert crime['stars']>=1 and crime['patrols']>=1,crime
                await page.wait_for_function('SF.police.patrols.length>=2',timeout=60000)
                print('RESPONSE',await page.evaluate('JSON.stringify(SF.police.patrols.map(u=>u.car.mesh.position.toArray()))'))
                print('CRIME',json.dumps(crime))
                await page.keyboard.press('p')
                await page.wait_for_function('SF.main.state.paused')
                saved=await page.evaluate('JSON.parse(localStorage.getItem(SF.save.key))')
                await page.keyboard.press('p')
                await page.wait_for_function('!SF.main.state.paused')
                await page.screenshot(path='/tmp/sunfall-play.jpg',type='jpeg',quality=85)
                await page.reload(wait_until='networkidle')
                await page.get_by_role('button',name='Continue',exact=True).click()
                restored=await page.evaluate('({position:SF.player.position.toArray(),cash:SF.missions.cash,storyDone:SF.missions.storyDone})')
                assert restored['cash']==saved['cash'] and restored['storyDone']==saved['storyDone']
                assert restored['position']==[saved['safehouse'][k] for k in ['x','y','z']]
                print('SAVE_RELOAD',json.dumps(restored))
            else:
                Path('screenshots').mkdir(exist_ok=True)
                for i,name in enumerate(['chase','street','drive','mission'],1):
                    await page.evaluate('(name)=>SF.shots.apply(name)',name)
                    await page.evaluate('SF.main.state.paused=true')
                    await page.wait_for_timeout(650)
                    await page.evaluate('SF.hud.setObjective(SF.missions.active.title,SF.missions.active.objectiveText);SF.render.render()')
                    await page.screenshot(path=f'screenshots/{i}-{name}.jpg',type='jpeg',quality=86)
                    print('SHOT',name,await page.evaluate('JSON.stringify({position:SF.player.position.toArray(),car:SF.player.car?.kind,stars:SF.police.stars,peds:SF.peds.instances.length,traffic:SF.traffic.moving?.length,objective:SF.missions.active.objectiveText,camera:SF.render.camera.position.toArray()})'))
        if len(sys.argv)<2 or sys.argv[1]=='inspect':
            await page.screenshot(path='/tmp/sunfall-inspect.jpg', type='jpeg', quality=85)
        print('ERRORS',json.dumps(errors))
        await browser.close()

async def main():
    server=await asyncio.create_subprocess_exec('node','serve.ts','--port','4175',stdout=asyncio.subprocess.PIPE)
    await server.stdout.readline()
    try:
        await run_browser()
    finally:
        server.terminate()
        await server.wait()

asyncio.run(main())
