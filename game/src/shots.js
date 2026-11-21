(function () {
  'use strict';
  const SF=window.SF=window.SF||{};
  let staged=null, clock=0;
  let heroPaint=null,patrolPaint=null;
  function paintBody(car,material){let body;car.mesh.traverse(o=>{if(!body&&o.material?.isMeshStandardMaterial)body=o.material;});car.mesh.traverse(o=>{if(o.material===body)o.material=material;});}
  const names=['cover','street','drive','mission'];
  function place(car,x,z,heading=0){car.mesh.position.set(x,.24,z);car.heading=heading;car.mesh.rotation.y=heading;car.speed=0;return car;}
  function apply(name){
    if(!names.includes(name))throw new Error('Unknown Sunfall staging: '+name);
    staged=null;
    if(SF.hud)SF.hud.clearOverlay();
    if(SF.player.vehicle){SF.player.vehicle.speed=0;SF.player.exit();}
    for(const u of SF.police.units){for(const m of [u.mesh,u.car?.mesh,u.officer?.mesh])if(m?.parent)m.parent.remove(m);}
    SF.police.units.length=0;
    SF.main.start(false);SF.phone.clear();SF.missions.reset();SF.police.init();SF.police.wanted=0;SF.player.health=100;
    if(SF.player.vehicle)SF.player.exit();
    SF.player.mesh.position.set(-516,.24,276.5);SF.input.yaw=-Math.PI/2;SF.input.pitch=0;
    const camera=SF.render.camera, rig=SF.render.cameraRig;
    rig.position.set(0,0,0);rig.rotation.set(0,0,0);
    staged={name,camera:[-528,3.6,294],target:[-517,1.4,265],cars:[],units:[],peds:[],traffic:[]};clock=0;
    if(name!=='drive'){
      const positions=[[-510,275.3],[-503,277],[-495,275.4],[-502,300],[-492,300],[-484,300]];
      SF.peds.people.filter(p=>p.health>0).slice(0,6).forEach((ped,i)=>staged.peds.push({ped,x:positions[i][0],z:positions[i][1]}));
    }
    if(name==='cover'||name==='drive'){
      const car=SF.vehicles.create({name:SF.vehicles.types[5],color:'#238c91'});
      if(!heroPaint)heroPaint=new THREE.MeshStandardMaterial({color:'#238c91',roughness:.48,metalness:.25});
      paintBody(car,heroPaint);
      car.owned=true;car.locked=false;
      place(car,-520,288,Math.PI/2);SF.player.mesh.position.copy(car.mesh.position);SF.player.enter(car);car.speed=18;
      staged.cars.push({car,x:-520,z:288,heading:Math.PI/2,speed:18});
      if(name==='cover'){
        SF.peds.people[0].mesh.position.set(-515,0,276.5);
        SF.police.crime('gunshot',SF.player.mesh.position);
        for(let i=0;i<5&&SF.police.stars<4;i++)SF.police.crime('shoot',SF.player.mesh.position);
        SF.police.update(.016,SF.state.elapsed);
        const usedPatrols=new Set();
        for(let i=0;i<2;i++){
          const existing=SF.police.units.find(u=>u.car?.patrol&&!usedPatrols.has(u.car));
          const patrol=existing?.car||SF.vehicles.create(SF.vehicles.types[1],{patrol:true});usedPatrols.add(patrol);
          if(!patrolPaint)patrolPaint=new THREE.MeshStandardMaterial({color:'#e1e5de',roughness:.55,metalness:.15});paintBody(patrol,patrolPaint);
          patrol.owned=true;
          let unit=existing||SF.police.units.find(u=>u.car===patrol);
          if(!unit){unit={callsign:'UNIT-'+(i?27:12),kind:'ground',status:'PURSUING',dist:0,car:patrol};SF.police.units.push(unit);}
          unit.callsign='UNIT-'+(i?27:12);unit.status='PURSUING';
          const x=-517,z=i?292.5:283.5;
          place(patrol,x,z,Math.PI/2);
          staged.units.push({u:unit,mesh:patrol.mesh,x,y:.24,z,fixed:true});
        }
        staged.camera=[-529,3.7,289.5];staged.target=[-493,2.6,287];
        SF.missions.objective='Lose the patrol · Escape Palma Strand';
        let ground=0,unitIndex=0;
        for(const u of SF.police.units){if(staged.units.some(s=>s.u===u))continue;const mesh=u.mesh||u.car?.mesh||u.vehicle?.mesh;if(!mesh||staged.units.some(s=>s.mesh===mesh))continue;const isAir=/air|heli/i.test(u.kind)||/AIR ONE/i.test(u.callsign);const x=isAir?-486:-507+ground*7,z=isAir?287:ground++%2?283:294;mesh.position.set(x,isAir?12:.24,z);mesh.rotation.y=Math.PI/2;
          if(isAir)mesh.traverse(o=>{if(o.geometry?.type==='ConeGeometry'&&o.material?.transparent){o.position.y=-(o.geometry.parameters?.height||20)/2-1;o.rotation.set(0,0,0);}});
          u.callsign=isAir?'AIR ONE':u.kind==='roadblock'?'BLOCKADE-'+(++unitIndex):['UNIT-12','UNIT-27','UNIT-34','UNIT-41','UNIT-52','UNIT-63','UNIT-72'][unitIndex++%7];
          staged.units.push({u,mesh,x,y:mesh.position.y,z});}
        // Keep distant roadblocks live just like the two close patrols, even
        // when the normal pursuit roster refreshes during the cover capture.
        const blocks=SF.police.units.filter(u=>u.kind==='roadblock');
        for(let i=0;i<2;i++){
          const u=blocks[i]||{kind:'roadblock',car:SF.vehicles.create('Solano Sedan',{patrol:true,scene:SF.actors.scene()})};
          u.callsign='BLOCKADE-'+(i+1);u.status='ROADBLOCK';
          if(!SF.police.units.includes(u))SF.police.units.push(u);
          staged.units=staged.units.filter(s=>s.u!==u);
          const x=-477,z=i?292.5:283.5;
          place(u.car,x,z,Math.PI/2);
          staged.units.push({u,mesh:u.car.mesh,x,y:.24,z,fixed:true});
        }
      } else {
        const x=-573,z=54;place(car,x,z,Math.PI);staged.cars[0]={car,x,z,heading:Math.PI,speed:22};
        for(const t of SF.traffic.cars){const m=t.mesh||t.car?.mesh;if(m&&Math.hypot(m.position.x-x,m.position.z-z)<18)m.position.z+=40;}
        const positions=[[-573,76],[-579,94],[-573,112],[-579,132],[-579,46],[-573,22]];
        SF.traffic.cars.slice(0,6).forEach((t,i)=>{const mesh=t.mesh||t.car?.mesh;if(mesh)staged.traffic.push({mesh,x:positions[i][0],z:positions[i][1]});});
        SF.player.mesh.position.set(x,.24,z);staged.camera=[-565,3.5,40];staged.target=[-584,2,78];
        SF.missions.objective='Marina coast road · SOLANO FM';SF.state.district='Marina';
        SF.render.sunSprite.position.set(-670,11,170);SF.render.sunSprite.scale.set(15,15,1);
      }
    } else if(name==='mission'){
      SF.missions.start(0);SF.player.mesh.position.set(-516,.24,276.5);
      staged.camera=[-521,2.8,279];staged.target=[-497,1,276.5];
    } else {
      staged.camera=[-523,3.2,279];staged.target=[-503,1.5,276.5];SF.missions.objective='Palma Strand · Meet Marco Reyes';
    }
    SF.render.sun.position.set(-700,90,260);SF.render.sun.intensity=1.5;SF.render.renderer.toneMappingExposure=.85;
    update(0);return {name,wanted:SF.police.wanted,units:SF.police.units.length};
  }
  function update(dt){
    if(!staged)return;clock+=Number(dt)||0;
    for(const s of staged.cars){place(s.car,s.x,s.z,s.heading);s.car.speed=s.speed;SF.player.mesh.position.copy(s.car.mesh.position);}
    for(const s of staged.peds)s.ped.mesh.position.set(s.x,0,s.z);
    for(const s of staged.traffic){s.mesh.position.set(s.x,.24,s.z);s.mesh.rotation.y=Math.PI;}
    for(const s of staged.units){if(s.fixed&&!SF.police.units.includes(s.u))SF.police.units.push(s.u);s.mesh.position.set(s.x,s.y,s.z);s.mesh.rotation.y=s.u.kind==='air'?-.5:Math.PI/2;s.u.dist=SF.player.mesh.position.distanceTo(s.mesh.position);}
    if(staged.name==='cover')for(const u of SF.police.units){const p=(u.mesh||u.car?.mesh)?.position;if(p)u.dist=SF.player.mesh.position.distanceTo(p);}
    if(staged.name==='cover')SF.missions.objective='Lose the patrol · Escape Palma Strand';
    if(staged.name==='drive'){SF.state.district='Marina';SF.state.currentDistrict={name:'Marina'};SF.missions.objective='Marina coast road · SOLANO FM';}
    if(staged.name==='street'){
      SF.missions.objective='Palma Strand · Meet Marco Reyes';SF.player.mesh.rotation.y=-Math.PI/2;
      const arms=SF.player.mesh.userData.arms;
      (Array.isArray(arms)?arms:Object.values(arms)).forEach((arm,i)=>{(arm.mesh||arm).rotation.x=i%2?.55:-.65;});
    }
    if(staged.name==='mission'&&SF.phone.current){SF.phone.current.elapsed=0;SF.phone.current.startedAt=SF.phone.clock;}
    SF.render.cameraRig.position.set(0,0,0);SF.render.cameraRig.rotation.set(0,0,0);
    SF.render.camera.position.set(...staged.camera);SF.render.camera.lookAt(new THREE.Vector3(...staged.target));
  }
  SF.shots={apply,update,get current(){return staged?.name||null;},clear(){staged=null;}};
  // Apply after boot; stage camera after the normal camera update each frame.
  let hooked=false;
  function frame(){if(SF.render?.ready&&SF.player?.mesh){if(!hooked){const renderer=SF.render.renderer,render=renderer.render.bind(renderer);renderer.render=function(scene,camera){update(0);if(staged)SF.hud.update(true);return render(scene,camera);};hooked=true;}const name=new URLSearchParams(location.search).get('shot');if(name&&!staged)apply(name);update(1/60);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
}());
