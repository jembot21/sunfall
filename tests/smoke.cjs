'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'game/index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="\.\/src\/([^"]+)"/g)].map(m => m[1]);
assert.equal(scripts.length, 18, 'all authored scripts are linked');

class Vector {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(n) { return this.set(n, n, n); }
  copy(v) { return this.set(v.x, v.y, v.z); }
  clone() { return new Vector(this.x, this.y, this.z); }
  addScaledVector(v, n) { this.x += v.x*n; this.y += v.y*n; this.z += v.z*n; return this; }
  subVectors(a, b) { return this.set(a.x-b.x, a.y-b.y, a.z-b.z); }
  multiplyScalar(n) { this.x*=n; this.y*=n; this.z*=n; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  normalize() { return this.multiplyScalar(1/(this.length() || 1)); }
  lerp(v, n) { this.x+=(v.x-this.x)*n; this.y+=(v.y-this.y)*n; this.z+=(v.z-this.z)*n; return this; }
  distanceToSquared(v) { return (this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2; }
}
class Object3D {
  constructor(geometry, material) { this.position=new Vector(); this.rotation=new Vector(); this.scale=new Vector(1,1,1); this.children=[]; this.userData={}; this.geometry=geometry; this.material=material; this.visible=true; this.quaternion={setFromUnitVectors(){}}; }
  add(...items) { for(const item of items){ item.parent=this; this.children.push(item); } }
  remove(item) { this.children=this.children.filter(child=>child!==item); }
  updateMatrix() {}
  updateProjectionMatrix() {}
  lookAt() {}
  getWorldDirection(v) { return v.set(0,0,1); }
  setMatrixAt() {}
  setColorAt() {}
  traverse(fn) { fn(this); for(const child of this.children)child.traverse(fn); }
  clone() { const copy=new Object3D(this.geometry,this.material); copy.position.copy(this.position); return copy; }
}
class Geometry { constructor(){this.attributes={position:{count:0,getY(){return 0;}}};} setAttribute(){} rotateZ(){} dispose(){} }
class Material { constructor(options){Object.assign(this,options);} clone(){return new Material(this);} dispose(){} }
class Color { constructor(){this.r=1;this.g=1;this.b=1;} copy(){return this;} lerp(){return this;} multiplyScalar(){return this;} offsetHSL(){return this;} }
class Light extends Object3D { constructor(){super();this.target=new Object3D();this.shadow={mapSize:{set(){}},camera:new Object3D()};} }
function context2d(){const noop=()=>{};return new Proxy({createRadialGradient(){return {addColorStop:noop};}}, {get(target,key){return key in target?target[key]:noop;},set(target,key,value){target[key]=value;return true;}});}
function element(){return {style:{},children:[],textContent:'',className:'',width:220,height:220,listeners:{},appendChild(child){this.children.push(child);return child;},addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);},getContext:context2d,querySelector(selector){return this.parts?.[selector] || element();}};}
function boot(search='') {
  const elements=new Map(),events={},storage=new Map();
  const slots=Array.from({length:5},()=>{const node=element();node.parts={'.weapon-name':element(),'.weapon-ammo':element()};return node;});
  const document={readyState:'loading',pointerLockElement:null,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element,querySelectorAll(){return slots;},addEventListener(type,fn){(events[type] ||= []).push(fn);},exitPointerLock(){this.pointerLockElement=null;}};
  const renderer={shadowMap:{},setPixelRatio(){},setSize(){},compile(){this.compiled=true;},render(){},setAnimationLoop(fn){this.frame=fn;}};
  const THREE={Vector3:Vector,Object3D,Group:Object3D,Scene:Object3D,Mesh:Object3D,InstancedMesh:Object3D,Sprite:Object3D,PerspectiveCamera:Object3D,Color,DirectionalLight:Light,HemisphereLight:Light,SpotLight:Light,PointLight:Light,WebGLRenderer:function(){return renderer;},CanvasTexture:class {},Float32BufferAttribute:class {},Fog:class {},MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}};
  for(const name of ['Box','Sphere','Plane','Cylinder','Cone','Torus','Octahedron'])THREE[name+'Geometry']=Geometry;
  for(const name of ['MeshStandard','MeshLambert','MeshBasic','Sprite'])THREE[name+'Material']=Material;
  const sandbox={THREE,document,console,URLSearchParams,location:{search},innerWidth:1280,innerHeight:800,devicePixelRatio:1,performance:{now:()=>1000},addEventListener(type,fn){(events[type] ||= []).push(fn);},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
  sandbox.window=sandbox;vm.createContext(sandbox);
  for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(root,'game/src',file),'utf8'),sandbox,{filename:file,timeout:3000});
  const SF=sandbox.SF;
  for(const name of ['CONFIG','input','render','world','city','vehicles','traffic','peds','weapons','police','player','missions','hud','audio','save'])assert.ok(SF[name],name+' exists');
  assert.equal(SF.weapons.defs.length,5);assert.equal(SF.missions.list.length,8);
  for(const fn of events.DOMContentLoaded || [])fn();
  assert.equal(renderer.compiled,true,'shaders compiled before play');assert.equal(typeof renderer.frame,'function');
  return {SF,events,renderer,storage,elements,sandbox};
}
const test=boot();
for(const fn of test.events.keydown)fn({code:'KeyW',key:'w',preventDefault(){}});
assert.equal(test.SF.input.isDown('forward'),true);
assert.equal(test.SF.input.isDown('KeyW'),true,'player raw-key queries map to actions');
for(const fn of test.events.keyup)fn({code:'KeyW'});
test.SF.player.cash=1200;test.SF.player.rep=350;test.SF.weapons.unlock(2);test.SF.weapons.ammo[2].mag=7;test.SF.weapons.ammo[2].reserve=65;
assert.equal(test.SF.save.save(),true);test.SF.player.cash=0;test.SF.weapons.ammo[2].reserve=0;assert.equal(test.SF.save.load(),true);assert.equal(test.SF.player.cash,1200);assert.equal(test.SF.weapons.ammo[2].mag+test.SF.weapons.ammo[2].reserve,72);
test.storage.set(test.SF.save.key,'{"version":99}');assert.equal(test.SF.save.load(),false);
assert.equal(test.SF.missions.start(test.SF.missions.list[0]),true);
const car=test.SF.vehicles.create(-117,123,0,1);test.SF.player.enterCar(car);test.SF.missions.update(0.15);assert.equal(test.SF.missions.storyDone,1);assert.equal(test.SF.weapons.owned[1],true);
assert.equal(car.active,true,'delivered player vehicle remains usable');
const chase=boot();chase.SF.player.pos.set(400,0,0);chase.SF.police.addHeat(chase.SF.CONFIG.wantedThresholds[4]);
for(let i=0;i<600;i++){chase.SF.player.pos.x+=34*0.05;chase.SF.police.update(0.05);}
assert.ok(chase.SF.police.wanted<4,'a sustained van-speed escape can outrun the helicopter');
const campaign=boot(), game=campaign.SF, population=game.peds.list.length;
for(let index=0;index<8;index++){
  const mission=game.missions.list[index];game.player.exitCar(true);game.player.pos.set(mission.x,0,mission.z);game.missions.start(mission);
  let checks=0;
  while(game.missions.active){
    assert.ok(++checks<300,'mission stages terminate: '+mission.title);
    const stage=game.missions.stage();
    if(stage.type==='goto'){game.player.pos.set(stage.x,0,stage.z);}
    if(stage.type==='drive'){
      game.player.exitCar(true);game.player.enterCar(game.vehicles.create(stage.x,stage.z,0,stage.car===undefined?1:stage.car));
    }
    if(stage.type==='deliver'){
      game.player.pos.set(stage.x,0,stage.z);game.missions.update(0.15);game.player.pos.set(stage.toX,0,stage.toZ);
    }
    if(stage.type==='tail'||stage.type==='chase'){
      const target=game.vehicles.list.find(car=>car.active&&car.driver==='mission');assert.ok(target);
      game.player.pos.set(target.pos.x,0,target.pos.z-30);if(stage.type==='chase')target.health=30;
    }
    if(stage.type==='shootout')for(const ped of game.peds.list)if(ped.missionGuard)ped.health=0;
    if(stage.type==='escape')game.police.reset();
    if(stage.type==='race'){
      if(!game.player.inCar)game.player.enterCar(game.vehicles.create(stage.x,stage.z,0,0));
      for(const point of stage.points){game.player.pos.set(point[0],0,point[1]);game.missions.update(0.15);}
      continue;
    }
    game.missions.update(0.15);
  }
  assert.equal(game.missions.storyDone,index+1,mission.title+' pays and advances story');
  assert.equal(game.peds.list.length,population,'guard pool returns ambient population to baseline');
}
assert.equal(game.weapons.owned[4],true,'rooftop stage unlocks the rifle');
assert.equal(game.player.cash,29350,'all story payouts are applied exactly once');
game.missions.start(game.missions.sideJobs[0]);game.missions.update(101);assert.equal(game.missions.active,null,'timed deliveries fail cleanly');
for(let n=0;n<4;n++){
  const shot=boot('?shot='+n);assert.equal(shot.SF.shots.active,true);shot.renderer.frame(1000);shot.renderer.frame(1016);
  if(n===0)assert.equal(shot.SF.player.inCar,null);
  if(n===1)assert.ok(shot.SF.player.inCar.speed>30);
  if(n===2){assert.ok(shot.SF.police.wanted>=3);assert.equal(shot.SF.police.air.active,true);}
  if(n===3){assert.ok(shot.SF.missions.active);assert.ok(shot.SF.weapons.cur>0);assert.equal(shot.elements.get('speaker-name').textContent,'Lena Voss');}
}
console.log('Sunfall smoke passed: 18 scripts; namespaces, boot, input, saves, eight mission paths, guard reuse, timed failure, helicopter escape, and four screenshot states. Rendering/audio are not validated by VM stubs.');
