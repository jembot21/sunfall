(function () {
  'use strict';
  const SF=window.SF,T=window.THREE,A=SF.actors;
  const slots=[{id:'fists',name:'Fists',unlocked:true,damage:18,range:2.5,cooldown:.42},{id:'pistol',name:'9mm Sidearm',unlocked:false,damage:34,range:85,cooldown:.2},{id:'carbine',name:'Bay Carbine',unlocked:false,damage:24,range:125,cooldown:.09}];
  let equipped=0,lastShot=0,flash=null,initialized=false,ray;
  function camera() {return SF.render && (SF.render.camera || SF.render.cameraRig && SF.render.cameraRig.camera);}
  function muzzle() {
    const cam=camera();if(!cam)return;
    if(!flash && SF.render.makeFlare) {flash=SF.render.makeFlare(0xffb65d,1.5);SF.render.scene.add(flash);}
    if(flash) {const p=cam.getWorldPosition(new T.Vector3()),d=new T.Vector3(0,0,-1).applyQuaternion(cam.quaternion);flash.position.copy(p.addScaledVector(d,.45));flash.visible=true;flash.scale.setScalar(1.1);flash.userData.ttl=.055;}
  }
  function resolve(object) {
    let node=object;
    while(node) {
      if(node.userData && node.userData.car)return {kind:'car',target:node.userData.car};
      const ped=SF.peds && SF.peds.people.find(p=>p.mesh===node);if(ped)return {kind:'ped',target:ped};
      if(node.parent && node.parent.userData && node.parent.userData.car)return {kind:'car',target:node.parent.userData.car};
      node=node.parent;
    }
    return null;
  }
  function firingVisible() {
    const player=SF.player;if(player.vehicle)return true;
    return (SF.police && SF.police.units || []).some(u=>u.kind==='ground' && u.car && u.car.mesh.position.distanceTo(player.position)<130);
  }
  function shoot() {
    const now=performance.now()/1000,slot=slots[equipped];if(now-lastShot<slot.cooldown || !SF.player.mesh || SF.player.vehicle)return false;lastShot=now;
    const cam=camera();if(!cam)return false;
    muzzle();if(SF.weapons.onShot)SF.weapons.onShot(slot.id);
    if(slot.id==='fists') {
      const p=SF.player.position,forward=new T.Vector3(0,0,-1).applyQuaternion(cam.quaternion),target=(SF.peds && SF.peds.people || []).filter(x=>x.health>0 && x.mesh.position.distanceTo(p)<slot.range).sort((a,b)=>a.mesh.position.distanceTo(p)-b.mesh.position.distanceTo(p)).find(x=>{
        const d=x.mesh.position.clone().sub(cam.getWorldPosition(new T.Vector3()));return d.normalize().dot(forward)>.72;
      });
      if(target){SF.peds.hit(target,slot.damage,forward);SF.police.crime('assault',target.mesh.position,.4);}return !!target;
    }
    cam.updateMatrixWorld(true);const origin=cam.getWorldPosition(new T.Vector3()),direction=new T.Vector3(0,0,-1).applyQuaternion(cam.quaternion).normalize();
    ray=ray || new T.Raycaster();ray.set(origin,direction);ray.far=slot.range;
    const hits=ray.intersectObjects(SF.render.scene.children,true);
    for(const hit of hits) {
      const result=resolve(hit.object);if(!result)continue;
      if(result.kind==='ped') SF.peds.hit(result.target,slot.damage,direction);else SF.vehicles.damage(result.target,slot.damage);
      if(firingVisible())SF.police.crime('shots fired',SF.player.position,.55);return true;
    }
      SF.police.crime('shots fired',SF.player.position,.35);return false;
  }
  SF.weapons={slots,get current(){return slots[equipped];},equip(id){const i=slots.findIndex((s,index)=>s.id===id || String(index+1)===String(id));if(i<0 || !slots[i].unlocked)return false;equipped=i;return true;},unlock(id){const slot=slots.find(s=>s.id===id);if(!slot)return false;slot.unlocked=true;return true;},shoot,onShot:null,
    init() {if(initialized)return this;initialized=true;window.addEventListener('mousedown',e=>{if(e.button===0 && !e.target.closest('button,input,[data-ui]'))shoot();});window.addEventListener('keydown',e=>{if(e.code==='Digit1')this.equip('fists');if(e.code==='Digit2')this.equip('pistol');if(e.code==='Digit3')this.equip('carbine');});return this;},
    update(dt) {if(flash && flash.userData.ttl>0){flash.userData.ttl-=dt;if(flash.userData.ttl<=0)flash.visible=false;}}
  };
  SF.weapons.init();
})();
