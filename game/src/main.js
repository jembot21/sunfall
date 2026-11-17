'use strict';
// Dependency-ordered boot and the single clamped simulation/render loop.
SF.pause=function(){if(SF.mode==='title')return;SF.mode=SF.mode==='play'?'pause':'play';document.getElementById('pause').style.display=SF.mode==='pause'?'flex':'none';if(SF.mode==='pause'){document.exitPointerLock();SF.save();}SF.input.fire=false;};
SF.begin=function(continuing,capture){
 SF.clearWanted();SF.health=100;SF.car=null;SF.player.mesh.visible=true;SF.player.x=SF.C.start.x;SF.player.z=SF.C.start.z;
 if(continuing)SF.load();else{SF.cash=80;SF.story=0;}
 SF.player.gun=SF.story>0;SF.missions.retry();SF.mode='play';SF.camera.position.set(SF.player.x,5,SF.player.z-8);SF.input.yaw=0;
 document.getElementById('menu').style.display='none';document.getElementById('hud').style.display='block';document.getElementById('sound').checked=SF.settings.sound;document.getElementById('sensitivity').value=SF.settings.sensitivity;
 SF.audio.init();if(capture!==false)SF.capture();SF.message('Dario: “One package. One payment. Then I am done.”',7);SF.save();
};
SF.capture=function(){try{const p=document.getElementById('game').requestPointerLock();if(p&&p.catch)p.catch(function(){});}catch(e){}};
SF.boot=function(){
 SF.initRender();SF.createCity();SF.initVehicles();SF.initPeds();SF.initPlayer();SF.initMissions();SF.initHUD();
 SF.camera.position.set(-234,28,108);SF.camera.lookAt(45,13,-55);SF.sun.position.set(-70,95,45);SF.sun.target.position.set(0,0,0);
 // Every material is already present, including pooled effects and siren lights.
 const visibility=[];SF.scene.traverse(function(o){if(o.isMesh||o.isLine){visibility.push([o,o.visible]);o.visible=true;}});SF.renderer.compile(SF.scene,SF.camera);for(const v of visibility)v[0].visible=v[1];
 document.getElementById('loading').style.display='none';document.getElementById('continue').disabled=!SF.readSave();
 document.getElementById('start').onclick=function(){SF.begin(false);};document.getElementById('continue').onclick=function(){SF.begin(true);};document.getElementById('resume').onclick=function(){SF.pause();SF.capture();};
 document.getElementById('sound').onchange=function(e){SF.settings.sound=e.target.checked;SF.save();};document.getElementById('sensitivity').oninput=function(e){SF.settings.sensitivity=Number(e.target.value);SF.save();};
 document.getElementById('game').addEventListener('mousedown',function(e){if(SF.mode!=='play')return;SF.audio.init();if(!document.pointerLockElement){SF.capture();return;}if(e.button===0)SF.input.fire=true;});
 document.addEventListener('visibilitychange',function(){if(document.hidden&&SF.mode==='play')SF.pause();});
 addEventListener('pagehide',function(){if(SF.mode!=='title')SF.save();});
 const shot=new URLSearchParams(location.search).get('shot');if(shot)SF.stageShot(shot);
 let last=0,saveClock=0,hudClock=0,frames=0;
 SF.renderer.setAnimationLoop(function(now){const dt=Math.min(last?(now-last)/1000:1/60,.05);last=now;
 if(SF.input.take('Escape')||SF.input.take('KeyP'))SF.pause();
 if(SF.mode==='play'){
 SF.time+=dt;SF.frame++;SF.updatePlayer(dt);SF.updateTraffic(dt);SF.updatePolice(dt);SF.updateVehicles(dt);SF.updatePeds(dt);SF.missions.update(dt);SF.updateCamera(dt);SF.audio.update();
 saveClock+=dt;if(saveClock>15){saveClock=0;SF.save();}
 hudClock+=dt;if(hudClock>.1){hudClock=0;SF.updateHUD();}
 }else if(SF.mode==='title'){SF.time+=dt;SF.ocean.material.uniforms.time.value=SF.time;}
 else SF.audio.update();
 SF.renderer.render(SF.scene,SF.camera);frames++;if(frames===3)window.__shotReady=true;
 });
};
try{SF.boot();}catch(e){document.getElementById('error').style.display='block';document.getElementById('error').textContent='Sunfall could not start. Desktop Chrome with WebGL is required. '+e.message;console.error(e);}
