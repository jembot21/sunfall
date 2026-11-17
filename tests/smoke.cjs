// Simulation smoke test with real vendored Three.js; no WebGL renderer or browser is simulated.
// Run from repository root: node tests/smoke.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const THREE=require(process.cwd()+'/game/vendor/three.min.js');
const context={console,THREE,Math,Float32Array,window:null,localStorage:{setItem(k,v){this[k]=v},getItem(k){return this[k]||null}},document:{createElement(){return {width:512,height:96,getContext(){return {fillRect(){},fillText(){}}}}}}};context.window=context;vm.createContext(context);
for(const f of ['config','random','world','city','vehicles','traffic','peds','police','player','missions','save'])vm.runInContext(fs.readFileSync('game/src/'+f+'.js','utf8'),context,{filename:f+'.js'});
const S=context.SF;S.scene=new THREE.Scene();S.input={keys:{},yaw:0,take(){return false}};S.audio={tone(){}};
S.createCity();S.initVehicles();S.initPeds();S.initPlayer();S.initMissions();
assert(!S.solid(S.luxury.x,S.luxury.z,1.2),'luxury car must be accessible');assert(!S.solid(S.player.x,S.player.z,.4),'spawn clear');
assert.equal(S.cars.length,40);assert.equal(S.peds.length,100);
S.player.x=S.starter.x;S.player.z=S.starter.z;S.enterExit();assert.equal(S.car,S.starter);
S.time=2;S.driveCar(S.car,.05,1,0,false);assert(S.car.speed>0);S.car.speed=0;S.enterExit();assert(!S.car);assert(S.player.mesh.visible);
S.car=S.starter;S.player.x=S.missions.target.x;S.player.z=S.missions.target.z;S.missions.update(.016);assert.equal(S.story,1);assert(S.player.gun);
S.missions.retry();S.player.x=-192;S.player.z=-128;S.missions.update(.016);assert.equal(S.missions.stage,1);assert(S.wanted>=2);
S.player.x=128;S.player.z=64;S.missions.update(.016);assert.equal(S.story,2);
S.missions.retry();S.player.x=64;S.player.z=64;S.missions.update(.016);assert(S.missions.running);
for(const t of S.racePoints){S.player.x=t.x;S.player.z=t.z;S.missions.update(.016);}assert.equal(S.story,3);
S.missions.retry();S.car=S.luxury;S.missions.update(.016);assert.equal(S.missions.stage,1);S.player.x=-128;S.player.z=192;S.missions.update(.016);assert.equal(S.story,4);
S.missions.retry();assert.equal(S.wanted,4);S.clearWanted();S.player.x=-192;S.player.z=-128;S.missions.update(.016);assert.equal(S.story,5);
S.missions.retry();S.player.x=-192;S.player.z=0;S.missions.update(.016);assert(S.missions.running);S.player.x=192;S.player.z=-64;S.missions.update(.016);assert.equal(S.missions.side,1);
S.save();S.cash=0;S.load();assert(S.cash>0);
S.story=0;S.missions.retry();S.time=100;S.crime(3,false);assert.equal(S.wanted,3);for(let i=0;i<600;i++){S.time+=1/60;S.frame=i;S.updateTraffic(1/60);S.updatePolice(1/60);S.updateVehicles(1/60);S.updatePeds(1/60);S.updatePlayer(1/60);}assert(S.cars.some(c=>c.kind==='police'&&c.active));
let draws=0;S.scene.traverse(o=>{if(o.isMesh||o.isLine)draws++});
console.log('PASS: actual Three.js scene construction; accessible spawn/lot; enter/exit; physics; all five missions; side job; save/load; 600 integrated AI/combat frames. Scene render objects:',draws);
