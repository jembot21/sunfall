(function (root) {
  'use strict';
  const SF=root.SF=root.SF||{};
  const scenes={
    chase:{player:{x:-32,y:.1,z:-100},wanted:4,camera:[-27,4.6,-84],look:[-32,1,-108]},
    street:{player:{x:-23,y:.24,z:45},wanted:0,camera:[-26,3.1,36],look:[-28,1.4,53]},
    drive:{player:{x:-285,y:.1,z:-205},wanted:0,camera:[-272,5.5,-187],look:[-325,3,-230]},
    mission:{player:{x:-215,y:.24,z:-239},wanted:0,camera:[-228,4.5,-253],look:[-216,1.8,-223]}
  };
  function apply(name) {
    const s=scenes[name]; if(!s)return false;
    if (!SF.render?.scene || !SF.vehicles?.spawn) { SF.missions?.stageCapture(name); return true; }
    SF.player.exit(true);
    SF.player.mesh.position.set(s.player.x,s.player.y,s.player.z);
    SF.player.mesh.visible=true;
    SF.player.heading=0;
    SF.police.heat=s.wanted*20;
    Object.assign(SF.police.search,s.player);
    SF.missions.begin(name==='chase'?2:0);
    if(name==='chase') { SF.missions.active.stage=3; SF.missions.update(0); }
    if(name==='drive'||name==='chase') {
      const car=SF.vehicles.spawn('sportsCar',s.player,{heading:name==='drive'?Math.PI:0});
      SF.player.mesh.position.copy(SF.vehicles.doorPoints(car)[0]);
      SF.player.enter(car);
      car.speed=name==='drive'?14:18;
      if(name==='drive') SF.police.heat=0;
    }
    // Warm the real population and dispatch systems at this location.
    for(let i=0;i<260;i++) { SF.traffic.update(.1);SF.peds.update(.1);SF.police.update(.02); }
    // Arrange existing traffic away from the subject, leaving the active actors clear.
    if(name==='chase'||name==='drive') {
      let index=0;
      SF.vehicles.instances.forEach(car=>{
        if(car===SF.player.car || car.locked)return;
        if(car.mesh.position.distanceTo(SF.player.position)<45) {
          car.mesh.position.set(name==='chase'?-96:-285,.1,(name==='chase'?-160:-260)+index++*9);
          car.mesh.rotation.y=0;
        }
      });
    }
    if(name==='chase') SF.police.patrols.slice(0,3).forEach((u,i)=>{
      u.car.mesh.position.set(-32+(i-1)*3.5,.1,-108-i*6);
      u.car.mesh.rotation.y=0;
      u.lights.forEach((l,j)=>l.material.emissiveIntensity=j?1:4);
    });
    if(name==='street') SF.peds.instances.slice(0,8).forEach((p,i)=>{
      p.mesh.position.set(i<4?-23:-41,.24,51+(i%4)*7);
      p.mesh.rotation.y=i%2?0:Math.PI;
      p.mesh.userData.animate(.1,1.3);
    });
    SF._captureScene=name;
    SF.main.state.playing=true;
    SF.hud.closeOverlay();
    SF.hud.dialogue('');
    SF.hud.setObjective(SF.missions.active.title,SF.missions.active.objectiveText);
    SF.hud.update(0);
    SF.render.camera.position.set(...s.camera);
    SF.render.camera.lookAt(...s.look);
    SF.render.render();
    return true;
  }
  SF.shots={scenes,apply,names:Object.keys(scenes)};
})(globalThis);
