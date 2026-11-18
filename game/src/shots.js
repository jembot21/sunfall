(function(SF){
'use strict';
const q=new URLSearchParams(location.search),name=q.get('shot');
if(!['coast','downtown','chase','end'].includes(name))return;
SF.random.reseed(Number(q.get('seed')||1));
SF.shots={active:true,name};
function stage(){
 const p=SF.player,camera=SF.render.camera,car=SF.vehicles.parked[0];
 SF.police.wanted=0;SF.police.units.forEach(c=>{c.mesh.visible=false;});
 if(name==='coast'){
  const x=SF.world.bounds.min+4;
  p.setStage(x,0,car);car.heading=0;car.mesh.rotation.y=0;
  camera.position.set(x+17,7,19);camera.lookAt(x-13,3,-12);
 }else if(name==='downtown'){
  p.setStage(-2,0);
  const traffic=SF.traffic.cars[0];traffic.pos.set(5,0,-5);traffic.axis='z';traffic.mesh.rotation.y=0;
  camera.position.set(7,5.5,17);camera.lookAt(0,1.5,-3);
 }else if(name==='chase'){
  p.setStage(0,0,car);car.heading=Math.PI;car.mesh.rotation.y=Math.PI;
  SF.police.wanted=3;
  SF.police.units.slice(0,2).forEach((c,i)=>{
   c.pos.set(i===0?-3:3,0,9+i*6);c.heading=Math.PI;c.mesh.rotation.y=Math.PI;c.mesh.visible=true;
   const color=i===0?0xff3344:0x3366ff;c.light.material.color.set(color);c.light.material.emissive.set(color);
  });
  camera.position.set(12,8,-20);camera.lookAt(0,1,6);
 }else{
  p.setStage(0,18);p.mesh.rotation.y=Math.PI/2;
  SF.missions.enterFreeRoam();p.addCash(1240-p.cash);
  camera.position.set(-11,4.5,26);camera.lookAt(0,1.3,18);
 }
 document.getElementById('start').classList.add('hidden');
 SF.hud.update(0);SF.render.update(0);window.__SHOT_READY=true;
}
// Main boots synchronously after this script; stage before the next painted frame.
requestAnimationFrame(stage);
})(window.SF);
