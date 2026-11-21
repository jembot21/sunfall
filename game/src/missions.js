(function () {
  'use strict';
  function line(who, role, text) { return {who: who, role: role, text: text}; }
  var marco = 'Marco Reyes', tia = 'Tia Navarro', lena = 'Lena Voss';
  var list = [
    {id:'wheels',chapter:'CH 1',title:'First Wheels',giver:marco,x:-272,z:42,intro:[line(marco,'Fixer','Welcome home, Dario. Take a Palma Sedan. My buyer is waiting in Old Town.')],stages:[{type:'drive',x:-117,z:123,car:1,text:'Take the marked Palma Sedan to Old Town.'}],payout:650,repReward:100,unlock:1},
    {id:'dues',chapter:'CH 2',title:'Harbour Dues',giver:tia,x:-205,z:123,intro:[line(tia,'Harbour contact','Three dockside drops. One buyer. Keep moving before the harbour watch comes around.')],stages:[{type:'deliver',x:-205,z:164,toX:-123,toZ:205,limit:85,text:'Collect the first dock package, then reach the buyer.'},{type:'deliver',x:-205,z:205,toX:-123,toZ:205,limit:65,text:'Collect the second dock package.'},{type:'deliver',x:-205,z:246,toX:-123,toZ:205,limit:65,text:'Collect the last package and bring it back.'}],payout:950,repReward:140},
    {id:'wheelwoman',chapter:'CH 3',title:'Wheelwoman',giver:lena,x:-205,z:-123,intro:[line(lena,'Wheelwoman','That yellow Sundial RS carries our stolen ledger. Stay fifteen to forty-five metres back. When I call it, close in.')],stages:[{type:'tail',x:-205,z:-93,duration:18,text:'Tail the Sundial RS: stay 15–45 m behind for 18 seconds.'},{type:'chase',x:-205,z:-41,text:'Stop the Sundial RS: damage it or stay within 11 m.'}],payout:1400,repReward:200},
    {id:'market',chapter:'CH 4',title:'Market Heat',giver:marco,x:123,z:41,intro:[line(marco,'Fixer','Our Market Row crew is pinned down. Clear the ambush, then shake the patrols.')],stages:[{type:'shootout',x:123,z:0,count:4,stars:1,text:'Clear four armed lookouts at Market Row.'},{type:'escape',stars:3,text:'Lose your three-star wanted level. Break line of sight.'}],payout:1900,repReward:260,unlock:2},
    {id:'tide',chapter:'CH 5',title:'High Tide',giver:tia,x:-237,z:123,intro:[line(tia,'Harbour contact','No boats tonight. Run the coast road before the tide cuts off our pickup window.')],stages:[{type:'race',x:-237,z:41,points:[[-237,41],[-237,-123],[-237,-205],[-123,-205],[-41,-205]],limit:85,text:'Drive the coast checkpoints before par: 85 seconds.'}],payout:2300,repReward:300},
    {id:'static',chapter:'CH 6',title:'Static',giver:lena,x:-123,z:-123,intro:[line(lena,'Wheelwoman','Take the relay van. Roadblocks are up and the helicopter is hunting. Deliver it, then disappear.')],stages:[{type:'drive',x:205,z:123,car:4,stars:4,text:'Take the marked relay van to Ironworks Port.'},{type:'escape',stars:4,text:'Escape the helicopter and roadblocks.'}],payout:3000,repReward:380},
    {id:'longshot',chapter:'CH 7',title:'The Longshot',giver:marco,x:123,z:123,intro:[line(marco,'Fixer','The rooftop lift is ready. Take the Longshot and cover the street. Then get out clean.')],stages:[{type:'goto',x:123,z:82,text:'Reach the service lift on the roof access marker.'},{type:'shootout',x:123,z:41,count:3,roof:true,unlock:4,text:'From the rooftop, use the Longshot to clear three armed lookouts.'},{type:'escape',stars:3,text:'Leave the roof and lose the patrols.'}],payout:3800,repReward:440},
    {id:'legend',chapter:'CH 8',title:'Bay Legend',giver:'The crew',x:-205,z:41,intro:[line(marco,'Fixer','One last ledger. One last convoy.'),line(tia,'Harbour contact','The harbour is ours if you bring this home.'),line(lena,'Wheelwoman','Dario, make the whole bay remember your name.')],stages:[{type:'chase',x:-205,z:0,stars:3,text:'Intercept the convoy leader.'},{type:'shootout',x:-123,z:123,count:6,stars:4,text:'Clear the six convoy guards in Old Town.'},{type:'escape',stars:5,text:'Survive five stars and disappear. Become a Bay Legend.'}],payout:15000,repReward:1000}
  ];
  var sides = [
    {id:'courier',chapter:'SIDE JOB',title:'Sunset Courier',giver:tia,x:-270,z:-41,intro:[line(tia,'Dispatch','A sealed parcel. A fast drop. No questions.')],stages:[{type:'deliver',x:-270,z:-41,toX:41,toZ:-123,limit:100,text:'Collect the parcel and deliver it to Downtown.'}],payout:450,repReward:35},
    {id:'streetrace',chapter:'SIDE JOB',title:'Coastal Sprint',giver:lena,x:-237,z:-205,intro:[line(lena,'Street racing','One rival, four checkpoints. Show me a clean line.')],stages:[{type:'race',x:-237,z:-123,points:[[-237,-123],[-237,41],[-123,41],[-123,205]],limit:75,rival:true,text:'Beat the rival through four checkpoints.'}],payout:650,repReward:55},
    {id:'stash',chapter:'SIDE JOB',title:'Hidden Stash',giver:marco,x:205,z:41,intro:[line(marco,'Fixer','Someone is guarding our stash. Take it back.')],stages:[{type:'shootout',x:205,z:123,count:2,text:'Clear the two stash guards.'},{type:'goto',x:205,z:123,text:'Pick up the recovered stash.'}],payout:550,repReward:45},
    {id:'fare',chapter:'SIDE JOB',title:'Bay Taxi Fare',giver:'Nico',x:-123,z:-205,intro:[line('Nico','Passenger','A Brisa Taxi is all yours. Get me to the Market Row curb before the dinner rush.')],stages:[{type:'fare',x:205,z:-41,text:'Pick up Nico in a Brisa Taxi and drop him at Market Row.'}],payout:420,repReward:35}
  ];
  var api = {list:list,sideJobs:sides,storyCount:list.length,activityCount:sides.length,storyDone:0,sideDone:0,safehouseUnlocks:[0],active:null,stageIndex:0,objective:'',progress:0,timer:0,blip:null,nearest:null,rooftop:false};
  var tick = 0, elapsed = 0, held = 0, lost = 0, picked = false, enemies = [], target = null, routeIndex = 0;
  var route = [[-205,-123],[-205,123],[123,123],[123,-123]], guardPool=[];
  var gunGeometry=new THREE.BoxGeometry(0.1,0.12,0.45),gunMaterial=new THREE.MeshStandardMaterial({color:0x302b3d});
  // Build every guard before shader warmup; inactive guards do not consume ambient AI slots.
  for(var g=0;g<6;g++){
    var guard=SF.peds.spawn(123,41),gun=new THREE.Mesh(gunGeometry,gunMaterial);
    SF.peds.list.pop();gun.position.set(0,-0.35,0.2);guard.mesh.userData.arms[1].add(gun);guard.mesh.visible=false;guardPool.push(guard);
  }
  var objective = new THREE.Mesh(new THREE.CylinderGeometry(2,2,9,12,1,true),new THREE.MeshBasicMaterial({color:0x42d8cc,transparent:true,opacity:0.38,depthWrite:false,side:THREE.DoubleSide}));
  objective.visible = false; SF.render.scene.add(objective);
  var markers = [], all = list.concat(sides);
  for (var i=0;i<all.length;i++) {
    var mesh = new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,6,12,1,true),new THREE.MeshBasicMaterial({color:i<8?0x42d8cc:0x70dbc6,transparent:true,opacity:0.32,depthWrite:false,side:THREE.DoubleSide}));
    mesh.position.set(all[i].x,3,all[i].z); SF.render.scene.add(mesh); markers.push(mesh);
  }
  var roof = new THREE.Mesh(new THREE.BoxGeometry(9,0.4,9),new THREE.MeshStandardMaterial({color:0x49869c,roughness:0.8}));
  roof.position.set(123,7.8,82); roof.visible=false; SF.render.scene.add(roof);
  var originalGround = SF.world.groundY;
  SF.world.groundY = function(x,z) { return api.rooftop && Math.abs(x-123)<4.5 && Math.abs(z-82)<4.5 ? 8 : originalGround(x,z); };
  function dist(x,z) { var dx=SF.player.pos.x-x,dz=SF.player.pos.z-z;return Math.sqrt(dx*dx+dz*dz); }
  function say(who,role,text) { if(SF.hud) SF.hud.say(who,role,text); }
  function heat(stars) { if(stars) SF.police.addHeat(Math.max(0,SF.CONFIG.wantedThresholds[stars]-SF.police.heat)); }
  function clearStage(keepTarget) {
    for(var i=0;i<enemies.length;i++) { var e=enemies[i],index=SF.peds.list.indexOf(e);if(index>=0)SF.peds.list.splice(index,1);e.missionGuard=false;e.mesh.visible=false;e.health=0; }
    enemies.length=0; api.rooftop=roof.visible=false;
    if(target&&!keepTarget){if(SF.player.inCar!==target)target.active=target.mesh.visible=false;target=null;}
  }
  function pin(x,z) { objective.position.set(x,4.5,z);objective.visible=true;api.blip=objective.position; }
  function stage() { return api.active && api.active.stages[api.stageIndex]; }
  function beginStage(keepTarget) {
    clearStage(keepTarget); var s=stage(); elapsed=held=lost=0;picked=false;routeIndex=0;
    api.progress=0;api.timer=s.limit||0;api.objective=s.text;pin(s.x||SF.player.pos.x,s.z||SF.player.pos.z); heat(s.stars);
    if(s.unlock){SF.weapons.unlock(s.unlock);SF.weapons.equip(s.unlock);}
    if((s.type==='drive'&&s.car!==undefined)||s.type==='fare') {
      var cars=SF.vehicles.list;
      var needed=s.type==='fare'?2:s.car;
      for(var c=0;c<cars.length;c++)if(cars[c].active&&cars[c].defIdx===needed&&cars[c].driver!=='cop'&&cars[c].pos.distanceToSquared(SF.player.pos)<900){target=cars[c];break;}
      if(!target)target=SF.vehicles.create(SF.player.pos.x+3,SF.player.pos.z,0,needed);
    }
    if(s.type==='tail'||s.type==='chase') {
      if(!target)target=SF.vehicles.create(s.x,s.z,0,5);
      target.driver='mission'; routeIndex=1;
    }
    if(s.type==='race'&&s.rival){target=SF.vehicles.create(SF.player.pos.x+4,SF.player.pos.z+5,0,0);target.driver='mission';}
    if(s.type==='shootout') {
      SF.weapons.unlock(1);if(!SF.weapons.cur)SF.weapons.equip(1);
      for(var i=0;i<s.count;i++) {
        var e=guardPool[i];e.pos.set(s.x+(i%2?3:-3),0,s.z+Math.floor(i/2)*5);e.missionGuard=true;e.health=65;e.down=e.fear=0;e.mesh.rotation.z=0;e.mesh.visible=true;
        SF.peds.list.push(e);enemies.push(e);
      }
      if(s.roof){api.rooftop=roof.visible=true;SF.player.pos.set(123,8,82);SF.player.yaw=Math.PI;}
    }
    if(s.type==='escape')objective.visible=false;
  }
  function start(job) {
    if(api.active)return false;
    api.active=job;api.stageIndex=0;
    var first=job.stages[0];
    if((first.type==='tail'||first.type==='race'||first.type==='drive'&&first.car===undefined)&&!SF.vehicles.nearestEnterable(SF.player.pos.x,SF.player.pos.z,12))SF.vehicles.create(SF.player.pos.x+3,SF.player.pos.z,0,1);
    if(first.type==='fare'&&!SF.vehicles.list.some(function(car){return car.active&&car.defIdx===2&&car.driver!=='cop'&&car.pos.distanceToSquared(SF.player.pos)<144;}))SF.vehicles.create(SF.player.pos.x+3,SF.player.pos.z,0,2);
    for(var i=0;i<job.intro.length;i++){var l=job.intro[i];say(l.who,l.role,l.text);}
    beginStage(false);return true;
  }
  function finishStage() {
    var was=stage().type;api.stageIndex++;
    if(api.stageIndex<api.active.stages.length){beginStage(was==='tail');if(SF.audio)SF.audio.pickup();return;}
    var job=api.active;clearStage(false);SF.player.cash+=job.payout;SF.player.rep+=job.repReward;
    if(list.indexOf(job)>=0){api.storyDone=Math.min(8,api.storyDone+1);if(api.storyDone>=4&&api.safehouseUnlocks.indexOf(1)<0)api.safehouseUnlocks.push(1);}else api.sideDone++;
    if(job.unlock!==undefined)SF.weapons.unlock(job.unlock);
    api.active=null;api.blip=null;objective.visible=false;
    SF.hud.toast('JOB COMPLETE · +$'+job.payout+' · +'+job.repReward+' REP');SF.audio.missionComplete();SF.save.save();
    say(job.giver,'Job complete',job.id==='legend'?'Solano Bay remembers. The city is yours, Dario.':'Good work, Dario. Your cut is in. Find the next marker when you are ready.');
  }
  function fail(reason){clearStage(false);api.active=null;api.blip=null;objective.visible=false;if(SF.hud)SF.hud.toast(reason+' · Return to the job marker to retry.');}
  function available(job){var n=list.indexOf(job);return n<0||n===api.storyDone;}
  function update(dt) {
    tick+=dt;var run=tick>=0.15;
    if(!api.active){
      if(!run)return;tick=0;api.nearest=null;var best=Infinity;
      for(var i=0;i<all.length;i++){var job=all[i],ok=available(job);markers[i].visible=ok;if(ok){var d=dist(job.x,job.z);if(d<best){best=d;api.nearest=job;}}}
      api.blip=api.nearest?markers[all.indexOf(api.nearest)].position:null;
      return;
    }
    var s=stage();elapsed+=dt;api.timer=s.limit?Math.max(0,s.limit-elapsed):0;
    if(s.type==='goto'||s.type==='drive'||s.type==='fare') {
      var car=SF.player.inCar;
      var required=s.type==='fare'?2:s.car;
      if((s.type==='drive'&&s.car!==undefined||s.type==='fare')&&(!car||car.defIdx!==required)){
        if(s.type==='fare')api.objective='Take a Brisa Taxi to the passenger drop-off.';
        api.blip=target.pos;objective.position.set(target.pos.x,4.5,target.pos.z);
      } else {api.blip=objective.position;objective.position.set(s.x,4.5,s.z);if(dist(s.x,s.z)<6&&(s.type==='goto'||car)){finishStage();return;}}
    }
    if(!run)return;var h=tick;tick=0;
    for(var m=0;m<markers.length;m++)markers[m].visible=false;
    if(target&&(s.type==='tail'||s.type==='chase')) {
      var point=route[routeIndex],dx=point[0]-target.pos.x,dz=point[1]-target.pos.z,d=Math.hypot(dx,dz);
      if(d<5){routeIndex=(routeIndex+1)%route.length;}else{
        var speed=s.type==='tail'?10:18;target.speed=target.health>0?speed:0;target.heading=Math.atan2(dx,dz);
        target.pos.x+=dx/d*target.speed*h;target.pos.z+=dz/d*target.speed*h;target.mesh.rotation.y=target.heading;
      }
      pin(target.pos.x,target.pos.z);var gap=dist(target.pos.x,target.pos.z);
      if(s.type==='tail'){if(gap>=15&&gap<=45)held+=h;else lost+=h;if(gap>95||lost>14){fail('Tail lost or cover blown');return;}api.progress=held/s.duration;if(held>=s.duration){finishStage();return;}}
      else {held=gap<11?held+h:Math.max(0,held-h);api.progress=Math.max(held/3.5,1-target.health/100);if(target.health<=35||held>=3.5){finishStage();return;}}
    }
    if(s.type==='deliver') {
      if(!picked&&dist(s.x,s.z)<5){picked=true;pin(s.toX,s.toZ);SF.audio.pickup();api.objective='Package aboard · deliver to the gold marker';}
      if(picked&&dist(s.toX,s.toZ)<6){finishStage();return;}api.progress=picked?0.5:0;
    }
    if(s.type==='shootout') {
      var dead=0;
      for(var e=0;e<enemies.length;e++){
        var guard=enemies[e];if(guard.health<=0||!guard.missionGuard){dead++;guard.missionGuard=false;guard.mesh.visible=false;var gi=SF.peds.list.indexOf(guard);if(gi>=0)SF.peds.list.splice(gi,1);continue;}
        guard.pos.set(s.x+(e%2?3:-3),0,s.z+Math.floor(e/2)*5);guard.mesh.rotation.y=Math.atan2(SF.player.pos.x-guard.pos.x,SF.player.pos.z-guard.pos.z);guard.mesh.userData.arms[1].rotation.x=-1.3;
        if(dist(guard.pos.x,guard.pos.z)<55&&SF.police.clearSight(guard.pos.x,guard.pos.z,SF.player.pos.x,SF.player.pos.z)&&SF.random.next()<h*0.65)SF.player.damage(5,guard.pos);
      }
      api.progress=dead/s.count;if(dead===s.count){finishStage();return;}
    }
    if(s.type==='escape'){api.progress=1-SF.police.wanted/(s.stars||5);if(!SF.police.wanted){finishStage();return;}}
    if(s.type==='race') {
      var cp=s.points[routeIndex];pin(cp[0],cp[1]);
      if(SF.player.inCar&&dist(cp[0],cp[1])<9){routeIndex++;if(routeIndex===s.points.length){finishStage();return;}}
      api.progress=routeIndex/s.points.length;
      if(s.rival&&target){var rp=s.points[target.raceIndex||0],rx=rp[0]-target.pos.x,rz=rp[1]-target.pos.z,rd=Math.hypot(rx,rz);if(rd<4){target.raceIndex=(target.raceIndex||0)+1;if(target.raceIndex>=s.points.length){fail('Your rival finished first');return;}}else{target.pos.x+=rx/rd*11*h;target.pos.z+=rz/rd*11*h;target.heading=target.mesh.rotation.y=Math.atan2(rx,rz);target.speed=11;}}
    }
    if(s.limit&&elapsed>=s.limit)fail('Time ran out');
  }
  api.update=update;api.start=start;api.fail=fail;api.say=say;
  api.interact=function(){if(api.active)return false;var j=api.nearest;if(j&&available(j)&&dist(j.x,j.z)<5&&!SF.player.inCar)return start(j);return false;};
  api.stage=stage;SF.missions=api;
}());
