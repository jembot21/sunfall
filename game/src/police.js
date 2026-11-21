(function () {
  'use strict';
  const SF=window.SF,T=window.THREE,A=SF.actors,units=[],ground=[],officers=[],roadblocks=[];
  let initialized=false,heat=0,search=0,clock=0,nextCall=0,aircraft=null,heliParts=null;
  const callsigns=(kind)=> {
    const c=(SF.CONFIG || {}).POLICE_CALLSIGNS || (SF.CONFIG || {}).policeCallsigns || {},pool=kind==='roadblock'?(c.BLOCKADE || c.blockade || c.roadblock):kind==='air'?(c.AIR_ONE || c.airOne || c.air):(c.GROUND || c.PATROL || c.ground || c.patrol);
    const fallback=kind==='roadblock'?['BLOCKADE-1','BLOCKADE-2','BLOCKADE-3']:kind==='air'?['AIR ONE']:['UNIT-12','UNIT-27','UNIT-34','UNIT-41','UNIT-52','UNIT-63'];
    const list=Array.isArray(pool)?pool:Array.isArray(c[kind])?c[kind]:fallback;
    return list[Math.floor(A.rand()*list.length)] || fallback[0];
  };
  function visibleToPlayer(position) {
    if(!SF.player.mesh || !SF.render.camera) return false;
    const origin=SF.render.camera.getWorldPosition(new T.Vector3()),target=A.position(position).setY(1.1),delta=target.sub(origin),distance=delta.length();
    if(distance>140) return false;
    const dir=delta.normalize(),forward=new T.Vector3(0,0,-1).applyQuaternion(SF.render.camera.quaternion);
    if(forward.dot(dir)<.25) return false;
    const ray=new T.Raycaster(origin,dir,0,distance),hits=ray.intersectObjects(SF.render.scene.children,true);
    return !hits.length || hits[0].distance>=distance-.5;
  }
  function createOfficer(car,side) {
    const mesh=A.figure(0x263d52,0xc18f70),offset=new T.Vector3(side*2,0,-1.4).applyAxisAngle(new T.Vector3(0,1,0),car.mesh.rotation.y);
    mesh.position.copy(car.mesh.position).add(offset);mesh.rotation.y=car.mesh.rotation.y;
    SF.actors.scene().add(mesh);const unit={callsign:callsigns('ground'),kind:'ground',status:'CLOSING',dist:0,mesh,car,officer:true};officers.push(unit);units.push(unit);return unit;
  }
  function ensureGround() {
    const desired=Math.min(5,Math.max(1,heat));
    while(ground.length<desired) {
      const car=SF.vehicles.create('Solano Sedan',{patrol:true,scene:SF.actors.scene()});
      car.mesh.position.copy(SF.player.position);car.mesh.position.x+=(A.rand()<.5?-1:1)*(85+A.rand()*35);car.mesh.position.z+=(A.rand()<.5?-1:1)*(85+A.rand()*35);
      const unit={callsign:callsigns('ground'),kind:'ground',status:'CLOSING',dist:0,car};ground.push(unit);units.push(unit);
      if(heat>=2) createOfficer(car,A.rand()<.5?-1:1);
    }
    while(ground.length>desired) {const unit=ground.pop(),i=units.indexOf(unit);if(i>=0)units.splice(i,1);SF.actors.scene().remove(unit.car.mesh);}
  }
  function ensureAir() {
    if(aircraft || heat<3) return;
    const mesh=new T.Group(),body=A.part(mesh,[1.35,.55,2.8],[0,0,0],0x39444b),tail=A.part(mesh,[.13,.3,1.8],[0,.02,-1.9],0x39444b),boom=A.part(mesh,[.16,.14,2],[0,0,-2.8],0x39444b);
    A.part(mesh,[.85,.5,.9],[0,.05,.75],0x364c56);
    const rotor=new T.Group();rotor.position.y=.45;mesh.add(rotor);A.part(rotor,[.12,.06,5.5],[0,0,0],0x21262a);A.part(rotor,[5.5,.06,.12],[0,0,0],0x21262a);
    const tailRotor=new T.Group();tailRotor.position.set(0,.1,-3.55);mesh.add(tailRotor);A.part(tailRotor,[.1,1.1,.1],[0,0,0],0x23282b);A.part(tailRotor,[.1,.1,1.1],[0,0,0],0x23282b);
    const cone=new T.Mesh(new T.ConeGeometry(5,17,18,1,true),new T.MeshBasicMaterial({color:0xd9e7c5,transparent:true,opacity:.12,side:T.DoubleSide,depthWrite:false}));cone.position.set(0,-8.8,.8);cone.rotation.x=Math.PI;mesh.add(cone);
    const lamp=A.part(mesh,[.18,.15,.18],[0,-.22,.8],0xfff2b3,undefined,true),flare=SF.render.makeFlare?SF.render.makeFlare(0xffefb0,2):null;if(flare){flare.position.copy(lamp.position);mesh.add(flare);}
    mesh.position.copy(SF.player.position);mesh.position.y=24;SF.actors.scene().add(mesh);
    heliParts={rotor,tailRotor,cone,flare};aircraft=mesh;
    const unit={callsign:callsigns('air'),kind:'air',status:'AIR WATCH',dist:0,mesh};units.push(unit);
  }
  function removeAir() {
    if(!aircraft)return;SF.actors.scene().remove(aircraft);const i=units.findIndex(u=>u.kind==='air');if(i>=0)units.splice(i,1);aircraft=null;heliParts=null;
  }
  function buildRoadblock() {
    if(roadblocks.length || heat<3) return;
    const p=SF.player.position,g=A.grid(),car=SF.player.vehicle,heading=car?car.mesh.rotation.y:SF.player.mesh.rotation.y;
    const axis=Math.abs(Math.sin(heading))>.7?'x':'z',coords=axis==='x'?g.zs:g.xs,fixed=coords.reduce((best,v)=>Math.abs(v-(axis==='x'?p.z:p.x))<Math.abs(best-(axis==='x'?p.z:p.x))?v:best,coords[0]||0);
    const pos=p.clone().add(new T.Vector3(Math.sin(heading),0,Math.cos(heading)).multiplyScalar(42));
    if(axis==='x')pos.z=fixed;else pos.x=fixed;
    [-1,1].forEach((side,i)=> {
      const patrol=SF.vehicles.create('Solano Sedan',{patrol:true,position:pos,scene:SF.actors.scene()});patrol.mesh.rotation.y=axis==='x'?Math.PI/2:0;patrol.mesh.position.x+=side*3.1;
      const unit={callsign:callsigns('roadblock'),kind:'roadblock',status:'ROADBLOCK',dist:0,car:patrol};roadblocks.push(unit);units.push(unit);
    });
  }
  function clearRoadblock() {roadblocks.splice(0).forEach(u=>{const i=units.indexOf(u);if(i>=0)units.splice(i,1);SF.actors.scene().remove(u.car.mesh);});}
  SF.police={
    wanted:0,units,
    init(scene=A.scene()) {if(!scene || !SF.vehicles || initialized)return this;initialized=true;return this;},
    crime(reason,position,amount=1) {
      if(!initialized)this.init();const pos=position?A.position(position):SF.player.position;
      const witnessed=ground.some(u=>u.car && u.car.mesh.position.distanceTo(pos)<150) || (SF.peds && SF.peds.people.some(p=>p.health>0 && p.mesh.position.distanceTo(pos)<35));
      if(!witnessed)return false;
      heat=A.clamp(Math.max(heat,1)+Math.max(.2,amount)*.72,1,5);this.wanted=Math.ceil(heat);search=0;
      SF.peds?.alarm(pos,65);return true;
    },
    get stars(){return this.wanted;},
    update(dt) {
      if(!initialized)this.init();if(!initialized || !SF.player.mesh || !SF.vehicles)return;
      dt=A.clamp(dt,0,.05);clock+=dt;const player=SF.player.position,hasSight=ground.some(u=>u.car && u.car.mesh.position.distanceTo(player)<115 && visibleToPlayer(u.car.mesh.position));
      if(heat>0) {
        if(hasSight)search=0;else search+=dt;
        if(search>7) {
          officers.forEach(u=>{SF.actors.scene().remove(u.mesh);const i=units.indexOf(u);if(i>=0)units.splice(i,1);});officers.length=0;
          heat=Math.max(0,heat-dt*.085);this.wanted=Math.ceil(heat);
        }
      }
      if(heat<=0) {
        heat=0;this.wanted=0;
        ground.splice(0).forEach(u=>{const i=units.indexOf(u);if(i>=0)units.splice(i,1);SF.actors.scene().remove(u.car.mesh);});
        officers.splice(0).forEach(u=>{const i=units.indexOf(u);if(i>=0)units.splice(i,1);SF.actors.scene().remove(u.mesh);});
        clearRoadblock();removeAir();
      }
      if(clock>nextCall && heat>0) {nextCall=clock+1.2;ensureGround();if(heat>=3){ensureAir();buildRoadblock();}else {removeAir();clearRoadblock();}}
      ground.forEach(u=> {
        const car=u.car,pos=car.mesh.position,dx=player.x-pos.x,dz=player.z-pos.z,dist=Math.hypot(dx,dz),desired=Math.atan2(dx,dz),error=A.angle(desired-car.mesh.rotation.y);
        u.dist=dist;u.status=search>0 && !hasSight?'SEARCHING':dist<8?'RAMMING':dist<35?'PURSUING':'CLOSING';
        if(dist<3.8 && SF.player.vehicle) {SF.vehicles.damage(SF.player.vehicle,14*dt);SF.player.vehicle.speed*=Math.exp(-2.2*dt);}
        SF.vehicles.drive(car,dt,{throttle:dist>3?1:0,steer:A.clamp(error*1.8,-1,1),brake:dist<2.8});
        if(u.officer) return;
      });
      officers.forEach(u=> {
        const target=SF.player.position,dx=target.x-u.mesh.position.x,dz=target.z-u.mesh.position.z,dist=Math.hypot(dx,dz);u.dist=dist;u.status=dist<30?'PURSUING':'CLOSING';
        if(u.car && u.car.mesh.position.distanceTo(target)>5) {u.mesh.position.x=u.car.mesh.position.x+Math.sin(u.car.mesh.rotation.y)*2;u.mesh.position.z=u.car.mesh.position.z-Math.cos(u.car.mesh.rotation.y)*2;}
      });
      roadblocks.forEach(u=>u.dist=u.car.mesh.position.distanceTo(player));
      if(aircraft) {
        const a=clock*.11,radius=38+heat*5;aircraft.position.set(player.x+Math.cos(a)*radius,24+Math.sin(clock*1.6)*2,player.z+Math.sin(a)*radius);
        aircraft.lookAt(player.x,0,player.z);heliParts.rotor.rotation.y+=dt*25;heliParts.tailRotor.rotation.z+=dt*28;
        if(heliParts.flare){heliParts.flare.visible=Math.sin(clock*8)>-.5;heliParts.flare.scale.setScalar(heliParts.flare.visible?1:.01);}
        const air=units.find(u=>u.kind==='air');if(air){air.dist=aircraft.position.distanceTo(player);air.status='AIR WATCH';}
      }
      units.forEach(u=> {if(!Number.isFinite(u.dist))u.dist=u.mesh?u.mesh.position.distanceTo(player):u.car.mesh.position.distanceTo(player);});
    }
  };
})();
