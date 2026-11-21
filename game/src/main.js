(function () {
  'use strict';
  function boot(){
    var player=SF.player,input=SF.input,canvas=document.getElementById('game'),start=document.getElementById('start-screen'),pause=document.getElementById('pause');
    var started=false,paused=false,shopOpen=false,endKind='',endTime=0,last=0,clock=0,clockTick=0,day=1,district='',previousCar=null,interact=false,titleCamera=0;
    var pauseCard=pause.querySelector('.overlay-card'),saveButton=document.createElement('button'),resumeButton=document.createElement('button');
    saveButton.textContent='Save at safehouse';resumeButton.textContent='Resume';pauseCard.appendChild(saveButton);pauseCard.appendChild(resumeButton);
    var shop=document.createElement('div');shop.id='shop';shop.className='panel';shop.style.cssText='display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(460px,90vw);pointer-events:auto;background:#211a35;z-index:20;max-height:85vh;overflow:auto';
    var title=document.createElement('h2');title.textContent='MARKET ROW · BAY OUTFITTERS';shop.appendChild(title);
    var note=document.createElement('p');note.textContent='1–4 buy a weapon · 5–8 buy three magazines ($75) · E / Esc close';shop.appendChild(note);
    var buttons=[];
    function button(label,action){var el=document.createElement('button');el.textContent=label;el.style.cssText='display:block;width:100%;padding:10px;margin:6px 0;background:#3a2d4b;color:#fff1db;border:1px solid #e9a15e;border-radius:6px;cursor:pointer';el.addEventListener('click',action);shop.appendChild(el);buttons.push(el);}
    function buy(slot,ammo){
      var w=SF.weapons,d=w.defs[slot],price=ammo?75:slot===1?450:d.price;
      if(ammo&&!w.owned[slot]){SF.hud.toast('Buy this weapon first');return;}
      if(!ammo&&w.owned[slot]){SF.hud.toast('Already owned');return;}
      if(ammo&&w.ammo[slot].reserve>=d.reserve){SF.hud.toast('Reserve ammo full');return;}
      if(player.cash<price){SF.hud.toast('Not enough cash');return;}
      player.cash-=price;if(ammo)w.addAmmo(slot,3);else{w.unlock(slot);w.equip(slot);}SF.audio.cash();SF.save.save();SF.hud.refresh();
    }
    for(var i=1;i<5;i++)(function(slot){button(slot+' · '+SF.weapons.defs[slot].name+' · $'+(slot===1?450:SF.weapons.defs[slot].price),function(){buy(slot,false);});})(i);
    for(var a=1;a<5;a++)(function(slot){button((slot+4)+' · '+SF.weapons.defs[slot].name+' ammo · $75',function(){buy(slot,true);});})(a);
    button('Close shop',function(){toggleShop(false);});document.getElementById('ui').appendChild(shop);
    var storeMarker=new THREE.Mesh(new THREE.CylinderGeometry(3,3,5,12,1,true),new THREE.MeshBasicMaterial({color:0xc98aff,transparent:true,opacity:0.4,depthWrite:false,side:THREE.DoubleSide}));storeMarker.position.set(205,2.5,10);SF.render.scene.add(storeMarker);
    var clinic=new THREE.Mesh(new THREE.BoxGeometry(1,3,1),new THREE.MeshBasicMaterial({color:0x78f2bd}));clinic.position.set(-117,1.5,123);SF.render.scene.add(clinic);
    function requestLock(){if(canvas.requestPointerLock){var result=canvas.requestPointerLock();if(result&&result.catch)result.catch(function(){SF.hud.toast('Click the world to capture the mouse');});}}
    function nearSafehouse(){
      for(var i=0;i<player.safehouses.length;i++){
        var home=player.safehouses[i],dx=player.pos.x-home.x,dz=player.pos.z-home.z;
        if(dx*dx+dz*dz<12*12)return true;
      }
      return false;
    }
    function setPause(value){
      if(!started||endKind||SF.shots.active)return;paused=value;pause.style.display=value?'grid':'none';SF.audio.pause(value);
      saveButton.disabled=!nearSafehouse();
      saveButton.style.opacity=saveButton.disabled?'.45':'1';
      if(value){if(document.exitPointerLock)document.exitPointerLock();}else requestLock();
    }
    function toggleShop(value){shopOpen=value;interact=false;input.pressed('enter');shop.style.display=value?'block':'none';if(value){SF.audio.pause(true);if(document.exitPointerLock)document.exitPointerLock();}else{SF.audio.pause(false);requestLock();}}
    saveButton.addEventListener('click',function(){if(!nearSafehouse()){SF.hud.toast('Return to a safehouse to save.');return;}if(SF.save.save())SF.hud.toast('Saved at the safehouse');});resumeButton.addEventListener('click',function(){setPause(false);});
    start.addEventListener('click',function(){if(started)return;started=true;player.respawn(0);start.style.display='none';SF.audio.unlock();SF.audio.engine(!!player.inCar);requestLock();});
    document.addEventListener('pointerlockchange',function(){if(started&&!input.locked&&!shopOpen&&!SF.shots.active&&!endKind)setPause(true);});
    window.addEventListener('keydown',function(event){
      if(event.repeat)return;
      if(shopOpen){if(event.code==='Escape'||event.code==='KeyE'){toggleShop(false);return;}var n=Number(event.key);if(n>=1&&n<=8)buy(n<=4?n:n-4,n>4);return;}
      if(event.code==='KeyM'&&started&&!paused&&!endKind){SF.hud.toggleMap();return;}
      if(event.code==='Escape'&&SF.hud.mapOpen){SF.hud.toggleMap(false);return;}
      if((event.code==='Escape'||event.code==='KeyP')&&started){setPause(!paused);return;}
      if(event.code==='KeyE')interact=true;
      if(event.code==='KeyN'&&started&&!paused&&player.inCar)SF.audio.radioNext();
    });
    function shopNear(){var dx=player.pos.x-205,dz=player.pos.z-10;return dx*dx+dz*dz<25&&!player.inCar;}
    function end(kind){
      endKind=kind;endTime=0;SF.missions.fail(kind==='busted'?'Job interrupted by patrols':'Job interrupted');
      var fee;if(kind==='busted'){fee=Math.min(player.cash,150+100*SF.police.wanted);player.cash-=fee;}else{fee=Math.min(player.cash,200+Math.floor(player.cash*0.1));player.cash-=fee;}
      SF.hud.showEnd(kind,(kind==='busted'?'Processing fine':'Clinic + lost cash')+' · $'+fee);SF.audio.engine(false);SF.audio.siren(false);
      if(document.exitPointerLock)document.exitPointerLock();
    }
    function recover(){
      var home=0,best=Infinity;
      if(endKind==='busted'){for(var i=0;i<SF.missions.safehouseUnlocks.length;i++){var idx=SF.missions.safehouseUnlocks[i],h=player.safehouses[idx],dx=player.pos.x-h.x,dz=player.pos.z-h.z,d=dx*dx+dz*dz;if(d<best){best=d;home=idx;}}player.respawn(home);}else player.respawn({x:-117,z:123});
      SF.police.reset();endKind='';SF.hud.hideEnd();SF.save.save();SF.audio.pause(false);requestLock();
    }
    function updateClock(dt){
      clock+=dt;clockTick+=dt;if(clockTick<0.1)return;clockTick=0;
      var minutes=1060+Math.floor(clock*3),newDay=day+Math.floor(minutes/1440),tod=minutes%1440;SF.day=newDay;
      SF.hud.setClock(newDay,String(Math.floor(tod/60)).padStart(2,'0')+':'+String(tod%60).padStart(2,'0'));
      var name=SF.world.districtAt(player.pos.x,player.pos.z);if(name!==district){district=name;SF.hud.toast(name);}else if(shopNear())SF.hud.toast('E — Gun Shop');
    }
    SF.day=1;if(!SF.shots.active)SF.save.load();day=SF.day||1;player.respawn(0);
    // Seed a clean first ride beside the Palma Strand safehouse.
    SF.vehicles.create(-269,42,0,1);
    SF.missions.update(0.15);SF.hud.setClock(day,'17:40');SF.hud.refresh();start.style.display='grid';
    SF.render.renderer.compile(SF.render.scene,SF.render.camera);
    if(SF.shots.active){started=true;SF.shots.stage();}
    function frame(time){
      var dt=last?Math.max(0,Math.min(0.05,(time-last)*0.001)):0;last=time;
      if(!SF.shots.active){
        if(started&&!paused&&!shopOpen&&!endKind){
          input.interactConsumed=false;
          if(interact){if(shopNear()){input.interactConsumed=true;input.pressed('enter');toggleShop(true);}else if(SF.missions.interact()){input.interactConsumed=true;input.pressed('enter');}}
          interact=false;
          if(!shopOpen){
            var oldHealth=player.health+player.armour,oldReady=SF.weapons.timeToReady,oldReload=SF.weapons.reloadT;
            if(input.pressed('attack')&&SF.weapons.cur&&SF.weapons.ammo[SF.weapons.cur].mag===0)SF.audio.emptyClick();
            SF.player.update(dt);SF.traffic.update(dt);SF.peds.update(dt);SF.police.update(dt);SF.weapons.update(dt);SF.missions.update(dt);SF.city.update(dt);SF.world.update(dt);
            if(player.health+player.armour<oldHealth)SF.audio.hit();
            if(!oldReload&&SF.weapons.reloadT>0)SF.audio.reload();
            if(!SF.weapons.cur&&oldReady<=0&&SF.weapons.timeToReady>0)SF.audio.punch();
            if(previousCar!==player.inCar){previousCar=player.inCar;SF.audio.engine(!!previousCar);if(!previousCar)SF.audio.radioStop();}
            updateClock(dt);
            var prompt='';
            if(player.inCar)prompt='Exit vehicle';
            else if(!SF.missions.active&&SF.missions.nearest&&Math.hypot(player.pos.x-SF.missions.nearest.x,player.pos.z-SF.missions.nearest.z)<5)prompt='Talk to '+SF.missions.nearest.giver+' · '+SF.missions.nearest.title;
            else if(SF.vehicles.nearestEnterable(player.pos.x,player.pos.z,4.2))prompt='Enter nearby vehicle';
            SF.hud.prompt(prompt);
            if(player.health<=0)end('wasted');else if(SF.police.pressure>=1)end('busted');
          }
        }else if(endKind){endTime+=dt;if(interact&&endTime>1.2)recover();interact=false;}
        else {interact=false;input.pressed('enter');SF.hud.prompt('');}
        input.clearLook();SF.audio.update(dt);SF.hud.update(dt);
        if(!started){
        // One deliberate title-shot sweep; gameplay cameras remain action-driven.
        titleCamera=time*0.000035;
        SF.render.camera.position.set(-355+Math.sin(titleCamera)*24,64+Math.sin(titleCamera*.65)*3,285-Math.cos(titleCamera)*20);
        SF.render.camera.lookAt(-42,13,-25);
        }
      }
      SF.render.update(dt,player.pos);
    }
    SF.render.renderer.setAnimationLoop(frame);
    SF.main={pause:setPause,resume:function(){setPause(false);},get paused(){return paused;},get started(){return started;}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}());
