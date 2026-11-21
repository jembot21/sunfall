"""Final real-browser playtest and JPEG captures; never rewrites game code."""
import asyncio, hashlib, json, sys
from pathlib import Path
from PIL import Image, ImageStat
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
async def ui_checks(page):
  await page.keyboard.press('p');await page.wait_for_timeout(500)
  print('PAUSE STATE',await page.evaluate('({mode:SF.state.mode,hidden:document.querySelector("#pause-overlay").hidden})'),flush=True)
  await page.locator('#pause-overlay').wait_for(state='visible',timeout=5000)
  await page.locator('#resume-game').click();await page.wait_for_function("SF.state.mode==='play'")
  await page.keyboard.press('m');print('MAP STATE',await page.evaluate('({mode:SF.state.mode,hidden:document.querySelector("#city-map").hidden})'),flush=True);await page.locator('#city-map').wait_for(state='visible',timeout=5000)
  await page.locator('#close-map').click();await page.wait_for_function("SF.state.mode==='play'")
  print('PASS pause / resume / city map / close',flush=True)
  await page.keyboard.press('Escape');await page.locator('#pause-overlay').wait_for(state='visible')
  await page.locator('#resume-game').click()
  radio=await page.evaluate('SF.audio.radio');await page.keyboard.press('n')
  assert await page.evaluate('SF.audio.radio')!=radio
  for mode,overlay,button in [('busted','busted-overlay','busted-respawn'),('wasted','wasted-overlay','wasted-respawn')]:
   await page.evaluate('(m)=>{SF.runtime.setMode(m);SF.hud.update(true)}',mode)
   assert await page.locator('#'+overlay).is_visible()
   await page.locator('#'+button).click()
  await page.evaluate('SF.missions.active=null;SF.missions.storyDone++;SF.hud.update(true)')
  assert await page.locator('#mission-complete').is_visible()
  await page.locator('#mission-complete-dismiss').click()
  await page.evaluate("SF.hud.dialogue('Nico Vale','Keep moving.',2);SF.hud.update(true)")
  assert await page.locator('#dialogue-box').is_visible()
  print('PASS Escape / radio toggle / BUSTED / WASTED / mission-complete / dialogue state checks',flush=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/opt/google/chrome/chrome',headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
  page=await browser.new_page(viewport={'width':1280,'height':720})
  errors=[]
  page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',e,flush=True)))
  await page.goto('http://127.0.0.1:8129/game/',wait_until='domcontentloaded')
  await page.wait_for_function('SF.player.mesh',timeout=120000)
  await page.locator('#new-game').click()
  await page.wait_for_function("SF.state.mode==='play'")
  print('PASS New Game enters play',flush=True)
  if '--ui' in sys.argv:
   await ui_checks(page);assert not errors,errors;await browser.close();return
  sample='''() => ({position:SF.player.mesh.position.toArray(),arms:Object.values(SF.player.mesh.userData.arms).map(a=>(a.mesh||a).rotation.toArray().slice(0,3))})'''
  start=await page.evaluate('SF.player.time')
  await page.keyboard.down('KeyW');await page.wait_for_function('(t)=>SF.player.time>t+.17',arg=start,timeout=60000)
  a=await page.evaluate(sample);start=await page.evaluate('SF.player.time')
  await page.wait_for_function('(t)=>SF.player.time>t+.19',arg=start,timeout=60000);b=await page.evaluate(sample)
  await page.keyboard.up('KeyW')
  delta=max(abs(x-y) for aa,bb in zip(a['arms'],b['arms']) for x,y in zip(aa,bb))
  assert delta>.001 and a['position']!=b['position'],(a,b)
  print('PASS sidewalk walking / arm swing',delta,a['position'],b['position'],flush=True)
  print('POPULATION',await page.evaluate('({peds:SF.peds.people.length,traffic:SF.traffic.cars.length,parked:SF.vehicles.parked.length})'),flush=True)
  await page.evaluate('''() => {const p=SF.player.mesh.position;const v=SF.vehicles.parked[0];p.copy(v.position);SF.police.wanted=0;}''')
  await page.keyboard.press('e');await page.wait_for_function('!!SF.player.vehicle',timeout=60000)
  assert await page.evaluate('!!SF.player.vehicle'),'E did not steal car'
  start=await page.evaluate('SF.player.time')
  await page.keyboard.down('KeyW');await page.wait_for_function('(t)=>SF.player.time>t+.25',arg=start,timeout=60000)
  slow=await page.evaluate('SF.player.vehicle.speed');start=await page.evaluate('SF.player.time')
  await page.wait_for_function('(t)=>SF.player.time>t+.5',arg=start,timeout=60000)
  fast=await page.evaluate('SF.player.vehicle.speed');await page.keyboard.up('KeyW')
  print('PASS vehicle theft / named cluster / changing speed',await page.locator('#vehicle-model').inner_text(),slow,fast,flush=True)
  assert slow!=fast and await page.locator('#vehicle-cluster').is_visible()
  await page.keyboard.down('Space');await page.wait_for_function('Math.abs(SF.player.vehicle.speed)<1',timeout=60000);await page.keyboard.up('Space')
  await page.keyboard.press('e');await page.wait_for_function('!SF.player.vehicle',timeout=60000)
  await page.evaluate('''() => {const p=SF.player.mesh.position;SF.peds.people[0].mesh.position.set(p.x,p.y,p.z-7);SF.weapons.unlock('pistol');SF.weapons.equip('pistol');SF.input.yaw=0;SF.input.pitch=0;}''')
  start=await page.evaluate('SF.player.time')
  await page.mouse.click(640,360);await page.mouse.down();await page.wait_for_function('(t)=>SF.player.time>t+.4',arg=start,timeout=60000);await page.mouse.up()
  crime=await page.evaluate('({stars:SF.police.stars,units:SF.police.units.length})')
  assert crime['stars']>0 and crime['units']>0,crime
  assert await page.locator('#dispatch-panel').is_visible()
  print('PASS witnessed crime / patrol / dispatch',crime,flush=True)
  try:
   await page.wait_for_function("SF.police.units.some(u=>u.kind==='air')",timeout=30000)
  except Exception:
   print('AIR FAILURE STATE',await page.evaluate('({elapsed:SF.state.elapsed,mode:SF.state.mode,health:SF.player.health,stars:SF.police.stars,units:SF.police.units.map(u=>({kind:u.kind,status:u.status})),p:SF.player.mesh.position})'),flush=True)
   raise
  print('AIR',await page.evaluate('SF.police.units.map(u=>({callsign:u.callsign,kind:u.kind,status:u.status}))'),flush=True)
  await page.locator('#dispatch-units .air-unit').wait_for(state='visible',timeout=30000)
  assert (await page.locator('#dispatch-units').inner_text()).startswith('AIR ONE')
  print('PASS three-star AIR ONE pinned dispatch',flush=True)
  await page.reload(wait_until='domcontentloaded');await page.locator('#new-game').click()
  await page.evaluate('SF.player.mesh.position.copy(SF.missions.story[0].start)')
  await page.keyboard.press('e');await page.locator('#phone-call').wait_for(state='visible',timeout=30000)
  print('MISSION STATE',await page.evaluate('({title:SF.missions.active?.title,call:SF.phone.current,objective:SF.missions.objective})'),flush=True)
  assert await page.locator('#phone-call').is_visible()
  assert await page.locator('#caller-name').text_content()=='Marco Reyes'
  print('PASS first mission accepted / Marco phone / objective',await page.locator('#objective-banner').inner_text(),flush=True)
  await ui_checks(page)
  assert not errors,errors
  print('PASS no browser exceptions',flush=True)
  await browser.close()
asyncio.run(main())
