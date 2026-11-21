import asyncio, hashlib, json, sys
from pathlib import Path
from PIL import Image, ImageStat
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/opt/google/chrome/chrome',headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
  page=await b.new_page(viewport={'width':1280,'height':720})
  errors=[]
  page.on('pageerror',lambda e:(errors.append(str(e)),print('ERROR',e.stack,flush=True)))
  (ROOT/'screenshots').mkdir(exist_ok=True)
  for name,file in json.loads((ROOT/'shots.json').read_text()).items():
   if len(sys.argv)>1 and name not in sys.argv[1:]:continue
   await page.goto('http://127.0.0.1:8129/game/?shot='+name,wait_until='domcontentloaded')
   await page.wait_for_function('(n)=>SF.shots.current===n',arg=name,timeout=120000)
   print('STAGING',name,flush=True)
   frame=await page.evaluate('SF.renderer.info.render.frame')
   await page.wait_for_function('(f)=>SF.renderer.info.render.frame>f+5',arg=frame,timeout=120000)
   await page.screenshot(path=str(ROOT/file),type='jpeg',quality=85,timeout=120000)
   print('STATE',await page.evaluate('({shot:SF.shots.current,mode:SF.state.mode,stars:SF.police.stars,phone:SF.phone.current,car:SF.player.vehicle?.displayName,camera:SF.camera.position,memory:SF.renderer.info.memory,draw:SF.renderer.info.render,contextLost:SF.renderer.getContext().isContextLost(),units:SF.police.units.map(u=>({callsign:u.callsign,status:u.status,dist:u.dist,kind:u.kind}))})'),flush=True)
   im=Image.open(ROOT/file)
   assert im.size==(1280,720) and max(ImageStat.Stat(im).var)>100
   assert (ROOT/file).stat().st_size<=250*1024
   assert not await page.locator('#start-screen').is_visible()
   if name=='cover':
    assert await page.locator('#dispatch-panel').is_visible()
    assert (await page.locator('#dispatch-units').inner_text()).startswith('AIR ONE')
    assert await page.evaluate("SF.police.units.some(u=>u.kind==='air'&&Math.abs(u.mesh.position.clone().project(SF.camera).x)<1&&Math.abs(u.mesh.position.clone().project(SF.camera).y)<1)")
    print('PATROL PROJECTIONS',await page.evaluate("SF.police.units.filter(u=>u.car).map(u=>({patrol:u.car.patrol,point:u.car.mesh.position.clone().project(SF.camera),position:u.car.mesh.position}))"),flush=True)
    assert await page.evaluate("SF.police.units.filter(u=>u.car?.patrol&&Math.abs(u.car.mesh.position.clone().add(new THREE.Vector3(0,1,0)).project(SF.camera).x)<1&&Math.abs(u.car.mesh.position.clone().add(new THREE.Vector3(0,1,0)).project(SF.camera).y)<1).length>=2")
   if name=='mission':
    assert await page.locator('#caller-name').text_content()=='Marco Reyes'
    assert await page.evaluate("SF.scene.children.some(o=>o.name==='Live mission objective ring'&&o.visible)")
   if name=='street':
    assert await page.evaluate("Object.values(SF.player.mesh.userData.arms).every(a=>{const m=a.mesh||a,p=m.getWorldPosition(new THREE.Vector3()).project(SF.camera);return m.visible&&Math.abs(p.x)<1&&Math.abs(p.y)<1})")
   print('CAPTURE',file,(ROOT/file).stat().st_size,hashlib.md5((ROOT/file).read_bytes()).hexdigest(),flush=True)
  assert not errors,errors
  assert len(list((ROOT/'screenshots').iterdir()))==4
  await b.close()
asyncio.run(main())
