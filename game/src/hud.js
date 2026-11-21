(function () {
  'use strict';
  const SF = window.SF = window.SF || {};
  const el = id => document.getElementById(id);
  const text = (id, value) => { const n = el(id); value = String(value ?? ''); if (n && n.textContent !== value) n.textContent = value; };
  const visible = (id, yes) => { const n = el(id); if (n) n.hidden = !yes; };
  let initialized = false, last = -Infinity, note = '', noteUntil = 0, dialogue = null;
  let firing=false;
  let lastDone=0;
  let objectiveRing=null,objectiveBeacon=null;
  let airSupport=null;
  let sirenMaterials=null;
  let uiMode=null;
  function setMode(mode){uiMode=['map','complete'].includes(mode)?mode:null;SF.runtime.setMode(uiMode?'pause':mode);}
  function updateSirens(){
    if(!sirenMaterials)sirenMaterials=['#ff2348','#167dff'].map(color=>new THREE.SpriteMaterial({map:SF.render.flareTexture,color,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
    const pulse=.5+.5*Math.sin(performance.now()*.012);
    sirenMaterials[0].opacity=.35+.65*pulse;sirenMaterials[1].opacity=1-.65*pulse;
    for(const u of SF.police.units){
      const car=u.car;if(!car?.mesh||car.mesh.userData.sunfallSirenFlares)continue;
      car.mesh.userData.sunfallSirenFlares=true;
      for(let i=0;i<2;i++){const flare=new THREE.Sprite(sirenMaterials[i]);flare.position.set(i? .55:-.55,1.72,0);flare.scale.set(1.4,1.4,1);car.mesh.add(flare);}
    }
  }
  function updateAirSupport(dt,time){
    const native=SF.police.units.find(u=>u.kind==='air'&&u!==airSupport?.unit);
    const needed=SF.police.stars>=3&&!native;
    if(!needed){if(airSupport){SF.render.scene.remove(airSupport.mesh);const i=SF.police.units.indexOf(airSupport.unit);if(i>=0)SF.police.units.splice(i,1);}return;}
    if(!airSupport){
      // A single pooled three-star air unit bridges the native four-star callout.
      // Every repeated part shares these two geometries and three materials.
      const box=new THREE.BoxGeometry(1,1,1),round=new THREE.SphereGeometry(1,12,8);
      const hull=new THREE.MeshStandardMaterial({color:'#21333d',roughness:.65}),glass=new THREE.MeshStandardMaterial({color:'#398e9d',roughness:.25,metalness:.25}),metal=new THREE.MeshStandardMaterial({color:'#9eaaa7',roughness:.7});
      const mesh=new THREE.Group();mesh.name='AIR ONE three-star patrol';
      const part=(g,m,x,y,z,sx,sy,sz)=>{const p=new THREE.Mesh(g,m);p.position.set(x,y,z);p.scale.set(sx,sy,sz);mesh.add(p);return p;};
      part(round,hull,0,0,0,1,1,2);part(round,glass,0,.1,-1.05,.88,.8,.95);
      part(box,hull,0,.25,3,.32,.4,3.5);part(box,hull,0,1,4.3,.15,1.5,.8);part(box,metal,0,.8,3.7,2,.1,.5);
      for(const side of [-1,1]){part(box,metal,side*1.1,-1,0,.12,.12,3.2);part(box,metal,side*.8,-.65,0,.1,.9,.12);}
      const rotor=part(box,metal,0,1.25,0,8,.08,.18);part(box,metal,0,1.25,0,.18,.08,8);
      const unit={callsign:'AIR ONE',kind:'air',status:'AIR WATCH',dist:0,mesh};
      airSupport={mesh,rotor,unit};
    }
    if(!SF.police.units.includes(airSupport.unit))SF.police.units.push(airSupport.unit);
    if(!airSupport.mesh.parent)SF.render.scene.add(airSupport.mesh);
    const p=SF.player.mesh.position,t=Number(time)||SF.state.elapsed;
    airSupport.mesh.position.set(p.x+Math.sin(t*.22)*32,22,p.z+Math.cos(t*.22)*32);
    airSupport.mesh.rotation.y=-t*.22;airSupport.rotor.rotation.y=t*35;
    airSupport.unit.dist=p.distanceTo(airSupport.mesh.position);
  }
  function controls(){
    const down=(a,b)=>SF.input.isDown(a)||(b&&SF.input.isDown(b));
    const forward=!!down('KeyW','ArrowUp'),backward=!!down('KeyS','ArrowDown'),left=!!down('KeyA','ArrowLeft'),right=!!down('KeyD','ArrowRight');
    let interact=SF.input.pressed('KeyE');
    const marker=SF.missions.nearestMarker,p=SF.player.mesh.position;
    if(interact&&!SF.player.vehicle&&!SF.missions.active&&marker&&Math.hypot(marker.x-p.x,marker.z-p.z)<7){
      if(marker.activity!==undefined)SF.missions.startActivity(marker.activity);
      else SF.missions.start(marker.mission??SF.missions.storyDone);
      interact=false;
    }
    return {forward,backward,left,right,run:!!down('ShiftLeft','ShiftRight'),sprint:!!down('ShiftLeft','ShiftRight'),jump:SF.input.pressed('Space'),interact,throttle:Number(forward)-Number(backward),steer:Number(left)-Number(right),brake:SF.input.isDown('Space'),cameraYaw:SF.input.yaw,yaw:SF.input.yaw,pitch:SF.input.pitch};
  }
  const air = u => /air|heli/i.test(u.kind || '') || /AIR ONE/i.test(u.callsign || '');
  const position = u => u.mesh?.position || u.car?.mesh?.position || u.vehicle?.mesh?.position || u.position;
  function map(canvas, full) {
    if (!canvas || !SF.player?.mesh) return;
    const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    const p = SF.player.mesh.position, b = SF.city.bounds;
    const scale = full ? Math.min(w / (b.maxX - b.minX + 90), h / (b.maxZ - b.minZ + 90)) : 2;
    const cx = full ? (b.minX + b.maxX) / 2 : p.x, cz = full ? (b.minZ + b.maxZ) / 2 : p.z;
    const xy = q => [w / 2 + (q.x - cx) * scale, h / 2 + (q.z - cz) * scale];
    c.clearRect(0, 0, w, h); c.fillStyle = '#173b42'; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w / 2 - cx * scale, h / 2 - cz * scale); c.scale(scale, scale);
    c.strokeStyle = '#7e8e85'; c.lineWidth = full ? 4 : 12;
    for (const s of SF.city.streets) {
      const a = s.start || s.a, z = s.end || s.b;
      c.beginPath();
      if (a && z) { c.moveTo(a.x, a.z); c.lineTo(z.x, z.z); }
      else if (s.x !== undefined && s.z !== undefined) { const dx = s.width || 12, dz = s.depth || s.length || 12; c.rect(s.x - dx / 2, s.z - dz / 2, dx, dz); }
      c.stroke();
    }
    c.restore();
    const dot = (q, color, r, helicopter) => { if (!q) return; const [x,y] = xy(q); c.fillStyle=color; c.strokeStyle=color; c.lineWidth=3; c.beginPath(); if (helicopter) {c.moveTo(x-9,y);c.lineTo(x+9,y);c.moveTo(x,y-9);c.lineTo(x,y+9);c.stroke();c.strokeRect(x-4,y-4,8,8);} else {c.arc(x,y,r,0,Math.PI*2);c.fill();} };
    const marker = SF.missions.active?.marker || SF.missions.nearestMarker;
    dot(marker?.position || marker, '#45ead3', 7);
    for (const u of SF.police.units) dot(position(u), air(u) ? '#9edaff' : '#4698ff', 5, air(u));
    const [x,y] = xy(p); c.save(); c.translate(x,y); c.rotate(SF.player.vehicle?.mesh.rotation.y || SF.input.yaw || 0); c.fillStyle='#fff4e5';c.strokeStyle='#142127';c.lineWidth=2;c.beginPath();c.moveTo(0,-12);c.lineTo(8,9);c.lineTo(0,5);c.lineTo(-8,9);c.closePath();c.fill();c.stroke();c.restore();
    if (full) {
      const columns=Math.max(...SF.CONFIG.districts.map(d=>d.col||0))+1,rows=Math.max(...SF.CONFIG.districts.map(d=>d.row||0))+1;
      for (const d of SF.CONFIG.districts) {const q=d.center || {x:b.minX+((d.col||0)+.5)*(b.maxX-b.minX)/columns,z:b.minZ+((d.row||0)+.5)*(b.maxZ-b.minZ)/rows};const [dx,dy]=xy(q);c.fillStyle='#fff4e5';c.font='bold 18px Arial';c.textAlign='center';c.fillText(d.name,dx,dy);}
    }
  }
  function init() {
    if(!SF.render?.ready||!SF.render.renderer||!SF.player?.mesh||!SF.runtime)return;
    if (initialized) return; initialized = true;
    const playerUpdate=SF.player.update;
    SF.player.update=function(dt){return playerUpdate.call(this,dt,controls());};
    const policeUpdate=SF.police.update;
    SF.police.update=function(dt,time){const result=policeUpdate.call(this,dt,time);updateAirSupport(dt,time);if(this.units.length)updateSirens();return result;};
    // Preserve the runtime's fixed step and menu keys while adapting the
    // seconds supplied by main to its monotonic millisecond timestamp API.
    const runtimeUpdate=SF.runtime.update;let gameTime=performance.now();
    SF.runtime.update=function(dt){gameTime+=Math.min(.1,Math.max(0,Number(dt)||0))*1000;return runtimeUpdate.call(this,gameTime);};
    addEventListener('mousedown',e=>{if(e.button===0&&SF.state.mode==='play')firing=true;});
    addEventListener('mouseup',e=>{if(e.button===0)firing=false;});
    addEventListener('blur',()=>{firing=false;});
    addEventListener('keydown',e=>{if(!e.repeat&&SF.state.mode==='play'&&/^[1-5]$/.test(e.key)){const slot=SF.weapons.slots[Number(e.key)-1];if(slot)SF.weapons.equip(slot.id);}});
    addEventListener('keydown',e=>{
      if(e.repeat||!['Escape','KeyP','KeyM','KeyN'].includes(e.code)||SF.state.mode==='menu')return;
      if(e.code==='KeyN'){if(SF.state.mode==='play'){e.preventDefault();e.stopImmediatePropagation();SF.audio.radio=!SF.audio.radio;}return;}
      if(!['play','pause'].includes(SF.state.mode))return;
      e.preventDefault();e.stopImmediatePropagation();SF.input.clear();
      const mode=uiMode||SF.state.mode;
      const next=e.code==='KeyM'?(mode==='map'?'play':'map'):(mode==='play'?'pause':'play');
      setMode(next);update(true);
      if(next==='pause')el('resume-game')?.focus();else if(next==='map')el('close-map')?.focus();
    },true);
    // Bound raster cost on software WebGL without adding any scene resources.
    if(SF.render?.renderer){SF.render.renderer.shadowMap.enabled=false;SF.render.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));}
    const renderer=SF.render.renderer,draw=renderer.render.bind(renderer);
    renderer.render=function(scene,camera){
      if(SF.state.mode!=='menu'&&!SF.shots?.current){
        const car=SF.player.vehicle,p=(car?.mesh||SF.player.mesh).position;
        const yaw=car?car.mesh.rotation.y:SF.input.yaw,distance=car?9:5.2;
        SF.render.cameraRig.position.set(0,0,0);SF.render.cameraRig.rotation.set(0,0,0);
        camera.position.set(p.x+Math.sin(yaw)*distance,p.y+(car?3.6:2.8),p.z+Math.cos(yaw)*distance);
        camera.lookAt(p.x,p.y+1.3,p.z);
      }
      return draw(scene,camera);
    };
    const materials=SF.city?.resources?.materials;
    if(materials){materials.road?.color.set('#292c32');materials.leaves?.color.set('#416446');materials.sidewalk?.color.set('#a39886');}
    const markerMaterial=new THREE.MeshBasicMaterial({color:'#45ead3',transparent:true,opacity:.85,depthWrite:false});
    objectiveRing=new THREE.Mesh(new THREE.TorusGeometry(2.3,.11,8,48),markerMaterial);
    objectiveRing.rotation.x=-Math.PI/2;objectiveRing.name='Live mission objective ring';
    objectiveBeacon=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,4,6),markerMaterial);
    objectiveBeacon.name='Live mission objective beacon';
    SF.render.scene.add(objectiveRing,objectiveBeacon);
    const bind = (id, fn) => el(id)?.addEventListener('click', fn);
    bind('new-game', () => {uiMode=null;SF.main.start(false);});
    bind('continue-game', () => {uiMode=null;SF.main.start(true);});
    if(el('new-game'))el('new-game').disabled=false;
    if(el('continue-game'))el('continue-game').disabled=!SF.save.saved;
    text('build-status','SUNFALL v3 · SOLANO BAY');
    bind('resume-game', () => setMode('play'));
    bind('open-map', () => setMode('map'));
    bind('close-map', () => setMode('play'));
    bind('quit-to-menu', () => setMode('menu'));
    bind('mission-complete-dismiss', () => setMode('play'));
    for (const id of ['busted-respawn','wasted-respawn']) bind(id, () => { SF.player.health=100;SF.player.busted=false;SF.police.wanted=0; if(SF.player.vehicle){SF.player.vehicle.speed=0;SF.player.exit();} SF.player.mesh.position.copy(SF.world.spawn); SF.runtime.setMode('play'); });
  }
  function update(force=false) {
    if(!SF.render?.ready||!SF.render.renderer||!SF.player?.mesh||!SF.runtime)return;
    init(); const now = performance.now(); if (force!==true&&now-last < 80) return; last=now;
    const done=SF.missions.storyDone||0;
    if(SF.state.mode==='play'){
      if(SF.player.health<=0)SF.runtime.setMode('wasted');
      else if(SF.player.busted)SF.runtime.setMode('busted');
      else if(done>lastDone){SF.missions.lastReward=SF.missions.story[done-1]?.payout;setMode('complete');}
    }
    lastDone=done;
    const mode = uiMode || SF.state?.mode || 'menu';
    visible('start-screen', mode==='menu'); visible('hud', mode!=='menu');
    for (const [id,m] of [['pause-overlay','pause'],['city-map','map'],['busted-overlay','busted'],['wasted-overlay','wasted'],['mission-complete','complete']]) visible(id,mode===m || id==='mission-complete' && mode==='mission-complete');
    if (!SF.player?.mesh) return;
    const stars = Math.max(0,Math.min(5,Number(SF.police.stars ?? SF.police.wanted) || 0));
    text('cash', '$'+Math.floor(SF.player.cash || 0).toLocaleString('en-US'));
    const wanted=el('wanted-stars'); if(wanted){wanted.setAttribute('aria-label',`Wanted level ${stars} of 5`);Array.from(wanted.children).forEach((n,i)=>n.classList.toggle('active',i<stars));}
    text('district-name', SF.state.currentDistrict?.name || SF.state.currentDistrict || SF.state.district || 'Solano Bay');
    const objective=SF.missions.objective || 'Explore Solano Bay';
    const active=SF.missions.active;
    const stage=active&&(active.stageIndex??active.stage??0);
    const target=active&&(active.marker?.position||active.marker||SF.missions.story[SF.missions.storyDone]?.stages[typeof stage==='number'?stage:0]?.position);
    objectiveRing.visible=objectiveBeacon.visible=!!target&&mode!=='menu';
    if(target){objectiveRing.position.set(target.x,(target.y||0)+.15,target.z);objectiveBeacon.position.set(target.x,(target.y||0)+2.2,target.z);}
    text('objective-tracker', SF.missions.active?.title || objective);
    text('objective-banner', now<noteUntil ? note : objective);visible('objective-banner',!!objective || now<noteUntil);
    visible('dispatch-panel', stars>=1);
    const units=SF.police.units.slice().sort((a,b)=>Number(air(b))-Number(air(a)) || (a.dist||0)-(b.dist||0));
    const list=el('dispatch-units'); if(list){const signature=units.map(u=>[u.callsign,u.status,Math.round(u.dist||0)].join('|')).join(';');if(list.dataset.signature!==signature){list.dataset.signature=signature;list.replaceChildren(...units.map(u=>{const row=document.createElement('div');row.className='dispatch-row'+(air(u)?' air-unit':'');for(const value of [air(u)?'AIR ONE':u.callsign,u.status||'Responding',Math.round(u.dist||0)+' m']){const span=document.createElement('span');span.textContent=value;row.appendChild(span);}return row;}));}}
    const call=SF.phone.current;visible('phone-call',!!call);
    if(call){text('caller-name',call.caller);text('call-dialogue',call.line);const elapsed=call.elapsed ?? Math.max(0,(SF.phone.clock || 0)-(call.startedAt || 0)); const bar=el('call-progress');if(bar)bar.style.width=(100*Math.max(0,1-elapsed/(SF.phone.duration||6)))+'%';}
    const car=SF.player.vehicle;visible('vehicle-cluster',!!car);
    if(car){const type=car.type || car.spec || car.mesh?.userData.type;const spec=typeof type==='number'?SF.CONFIG.VEHICLE_TYPES[type]:typeof type==='string'?SF.CONFIG.VEHICLE_TYPES.find(t=>t.id===type || t.name===type):type;text('vehicle-model',(spec?.name || car.displayName || car.name || 'Vehicle').toUpperCase());text('vehicle-speed',Math.round(Math.abs(car.speed || 0)*3.6));}
    const p=SF.player.mesh.position,marker=SF.missions.nearestMarker;
    const markerNear=marker&&Math.hypot(marker.x-p.x,marker.z-p.z)<7;
    const near=SF.vehicles.nearest(p); const prompt=SF.state.prompt || (car?(Math.abs(car.speed)>3?'Space · Brake to exit':'E · Exit vehicle'):markerNear?'E · '+marker.title:near?'E · Enter vehicle':'');
    text('action-prompt',prompt);visible('action-prompt',!!prompt && mode==='play');
    visible('dialogue-box',!!dialogue && now<dialogue.until);if(dialogue){text('dialogue-speaker',dialogue.speaker);text('dialogue-text',dialogue.line);}
    text('mission-reward',SF.missions.lastReward ? '$'+SF.missions.lastReward : 'Saved to your story progress');
    map(el('minimap'),false);if(mode==='map')map(el('city-map-canvas'),true);
  }
  SF.hud={init,update,clearOverlay(){uiMode=null;},banner(message,seconds=4){note=message;noteUntil=performance.now()+seconds*1000;},dialogue(speaker,line,seconds=5){dialogue={speaker,line,until:performance.now()+seconds*1000};},show:()=>visible('hud',true),hide:()=>visible('hud',false)};
  // UI cadence stays independent of the simulation's fixed step.
  function frame(){
    if(SF.render?.ready&&SF.player?.mesh){
      if(firing&&SF.state.mode==='play'&&!SF.player.vehicle)SF.weapons.shoot();
    }
    update();requestAnimationFrame(frame);
  }requestAnimationFrame(frame);
}());
