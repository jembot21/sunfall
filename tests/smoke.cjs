const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let failed = false;
function pass(s){ console.log('PASS '+s); }
function fail(s){ console.log('FAIL '+s); failed = true; }
const html = fs.readFileSync(path.join(root,'game/index.html'),'utf8');
const hud = fs.readFileSync(path.join(root,'game/src/hud.js'),'utf8');
const mapId = hud.match(/map\s*=\s*document\.getElementById\(['"]([^'"]+)['"]\)/)?.[1];
const canvases = [...html.matchAll(/<canvas\b[^>]*\bid=["']([^"']+)["'][^>]*>/g)];
if(mapId && canvases.some(m=>m[1]===mapId))pass('minimap canvas matches HUD id '+mapId);
else fail('missing minimap canvas expected by HUD');
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
for(const src of scripts){const file=path.join(root,'game',src);if(fs.existsSync(file))pass('script exists '+src);else fail('missing script '+src);}
for(const file of fs.readdirSync(path.join(root,'game/src')).filter(f=>f.endsWith('.js'))){try{new Function(fs.readFileSync(path.join(root,'game/src',file),'utf8'));pass('syntax '+file);}catch(e){fail('syntax '+file+' '+e.message);}}
function gameFiles(dir){for(const f of fs.readdirSync(dir)){const p=path.join(dir,f),s=fs.statSync(p);if(s.isDirectory()&&f!=='vendor')gameFiles(p);else if(s.isFile()&&/\.(html|js|json)$/.test(f)){if(/https?:\/\//.test(fs.readFileSync(p,'utf8')))fail('offline URL '+path.relative(root,p));}}}
gameFiles(path.join(root,'game'));const shots=JSON.parse(fs.readFileSync(path.join(root,'shots.json'),'utf8'));if(shots.length===4)pass('shots.json has 4 shots');else fail('shots.json count');
// Exercise the real game modules with Three geometry and a recording canvas.
const vm = require('node:vm');
const assert = require('node:assert/strict');
const Three = require('../game/vendor/three.min.js');
for(const shot of ['downtown','chase','coast','end']){
 try{
  const calls=[],frames=[],elements=new Map();
  const ctx=new Proxy({}, {get:(o,k)=>o[k]||(o[k]=(...args)=>{calls.push([k,...args]);if(k==='createLinearGradient')return {addColorStop(){}};})});
  function element(){return {width:220,height:220,style:{},textContent:'',classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},getContext:()=>ctx};}
  const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element,addEventListener(){}};
  class Renderer{constructor(){this.domElement=element();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>1};}setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}}
  const sandbox={THREE:{...Three,WebGLRenderer:Renderer},document,location:{search:'?shot='+shot},URLSearchParams,innerWidth:1280,innerHeight:720,performance:{now:()=>0},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:f=>frames.push(f),setTimeout(){},addEventListener(){},console};
  sandbox.window=sandbox;vm.createContext(sandbox);
  for(const src of scripts.filter(s=>!s.includes('vendor/')))vm.runInContext(fs.readFileSync(path.join(root,'game',src),'utf8'),sandbox,{filename:src});
  frames.shift()(0);frames.shift()(16);
  const sf=sandbox.SF;
  assert.equal(sandbox.__SHOT_READY,true);
  assert(calls.some(c=>c[0]==='stroke'),'road grid drawn');
  assert(calls.some(c=>c[0]==='rotate'),'player arrow drawn');
  assert(calls.filter(c=>c[0]==='arc').every(c=>c.slice(1).every(Number.isFinite)),'finite minimap coordinates');
  assert(sf.render.scene.children.some(c=>c.geometry?.type==='CircleGeometry'),'circular sun');
  function inFrame(pos){const p=pos.clone().add(new Three.Vector3(0,1,0)).project(sf.render.camera);return Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z>-1&&p.z<1;}
  assert(inFrame(sf.player.position),'player in camera frame');
  if(shot==='chase'){
   assert.equal(elements.get('wanted').textContent,'★★★☆☆');
   assert.equal(sf.police.units.filter(c=>c.mesh.visible).length,2);
   assert(sf.police.units.slice(0,2).every(c=>inFrame(c.pos)),'both police in frame');
  }
  if(shot==='coast'){assert(sf.player.inCar);assert(sf.world.isRoad(sf.player.position.x,sf.player.position.z));}
  if(shot==='downtown')assert(inFrame(sf.traffic.cars[0].pos),'traffic in frame');
  if(shot==='end'){assert.equal(sf.player.cash,1240);assert.equal(elements.get('mission').textContent,'');assert(sf.missions.storyDone);assert.equal(sf.missions.current,null);}
  sf.random.reseed(42);const a=sf.random.shuffle([1,2,3,4,5]);sf.random.reseed(42);assert.deepEqual(a,sf.random.shuffle([1,2,3,4,5]));assert.equal(new Set(a).size,5);
  sandbox.localStorage.getItem=()=>JSON.stringify({version:999,cash:9999});sf.save.load();assert.equal(sf.save.data.cash,80);
  pass('runtime staging, minimap, sun, RNG and save '+shot);
 }catch(e){fail('runtime '+shot+' '+e.stack);}
}
process.exitCode=failed?1:0;
