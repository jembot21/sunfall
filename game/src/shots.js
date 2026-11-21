(function () {
  'use strict';
  var query = new URLSearchParams(window.location.search), raw = query.get('shot');
  var number = raw !== null && /^[0-3]$/.test(raw) ? Number(raw) : -1;
  function pedestrians(x,z,heading){
    var list=SF.peds.list,fx=Math.sin(heading),fz=Math.cos(heading);
    for(var i=0;i<list.length;i++){
      var p=list[i],side=i%2?-1:1,rank=Math.floor(i/2);
      p.health=100;p.fear=0;p.down=0;p.mesh.rotation.z=0;p.mesh.visible=true;
      p.pos.set(x+fx*(10+rank%4*5)+side*Math.cos(heading)*6,0,z+fz*(10+rank%4*5)-side*Math.sin(heading)*6);
      p.home=fx? p.pos.z:p.pos.x;p.sign=rank%2?1:-1;SF.peds.animate(p.mesh,i*.63,.48,false);
    }
  }
  function traffic(x,z,heading,roadX){
    var fleet=SF.traffic.fleet;
    for(var i=0;i<Math.min(10,fleet.length);i++){
      var slot=fleet[i],rank=Math.floor(i/2)+1,side=i%2?-1:1;
      var car=slot.car;car.reset(roadX+side*4,z+Math.cos(heading)*(18+rank*14),i%2?heading:heading+Math.PI);
      car.driver='ai';car.speed=12+i%4*2;slot.dir=i%4;car.mesh.visible=true;
    }
  }
  function apply(){
    if(number<0)return false;
    SF.random.reseed(2026+number);SF.police.reset();
    var p=SF.player;p.respawn(0);p.cash=18450;p.rep=1720;p.health=96;p.armour=58;
    SF.hud.setClock(3,'19:08');
    for(var i=1;i<5;i++)SF.weapons.unlock(i);
    SF.weapons.equip(number===3?1:0);

    if(number===0){
      var x=41,z=68,heading=0,car=SF.vehicles.create(x,z,heading,1);
      p.enterCar(car);car.stolen=true;car.speed=22;car.vz=22;p.yaw=heading;
      car.mesh.children[1].material=car.mesh.children[1].material.clone();
      car.mesh.children[1].material.color=new THREE.Color('#bd5145');
      traffic(x,z,heading,x);pedestrians(x,z,heading);
      SF.missions.start(SF.missions.list[3]);
      SF.police.heat=SF.CONFIG.wantedThresholds[4]+3;
      SF.police.update(.12);
      var patrol=SF.police.units.filter(function(unit){return unit.active&&unit.car;});
      for(var c=0;c<patrol.length;c++){
        var unit=patrol[c];
        if(!unit||!unit.car)continue;
        unit.car.reset(x+[-4,4,0,6,-6][c%5],z-10-c*12,heading);
        unit.car.driver='cop';unit.car.speed=16;unit.pos.copy(unit.car.pos);
        unit.active=true;unit.mesh.visible=true;
        if(unit.lightA)unit.lightA.visible=true;
        if(unit.lightB)unit.lightB.visible=true;
      }
      SF.police.seenPlayer=true;SF.police.air.active=true;SF.police.air.mesh.visible=true;
      SF.police.air.pos.set(x+20,66,z+25);
      SF.hud.prompt('');
      SF.render.camera.position.set(x+9,8,z-62);SF.render.camera.lookAt(x,1.5,z+14);
    }else if(number===1){
      var sx=54,sz=-67,sh=0;p.pos.set(sx,0,sz);p.heading=p.yaw=sh;p.mesh.visible=true;
      SF.peds.animate(p.mesh,1.15,0.88,false);
      pedestrians(sx,sz,sh);
      for(var q=0;q<SF.peds.list.length;q++){
        var walker=SF.peds.list[q],side=q%2?-1:1,rank=Math.floor(q/2);
        walker.pos.set(side<0?30:53,0,sz+10+rank*6.2);walker.home=walker.pos.x;walker.axis=true;
        walker.sign=rank%2?1:-1;SF.peds.animate(walker.mesh,q*.72,.55,false);
      }
      traffic(sx,sz,sh,41);
      SF.missions.update(.2);SF.hud.prompt('');
      SF.render.camera.position.set(sx-4,5.6,sz-9);SF.render.camera.lookAt(sx-4,1.5,sz+31);
    }else if(number===2){
      var cx=-245,cz=-57,ch=0,coast=SF.vehicles.create(cx,cz,ch,0);
      p.enterCar(coast);coast.speed=34;coast.vz=34;coast.stolen=false;p.yaw=ch;
      traffic(cx,cz,ch,cx);pedestrians(cx,cz,ch);SF.missions.update(.2);SF.hud.prompt('');
      SF.render.camera.position.set(cx+13,7,cz-13);SF.render.camera.lookAt(cx+1,1.5,cz+42);
    }else{
      var mx=-205,mz=143,mh=0;p.pos.set(mx,0,mz);p.heading=p.yaw=mh;p.mesh.visible=true;
      SF.peds.animate(p.mesh,1.15,0.88,false);
      pedestrians(mx,mz,mh);traffic(mx,mz,mh,mx);
      SF.missions.start(SF.missions.list[1]);SF.hud.prompt('');
      SF.render.camera.position.set(mx-4,5.4,mz-10);SF.render.camera.lookAt(mx-4,1.5,mz+29);
    }
    document.getElementById('start-screen').style.display='none';
    document.getElementById('hud-dialogue').style.display='none';
    SF.hud.refresh();document.getElementById('hud-dialogue').style.display='none';
    SF.hud.setClock(3,'19:08');SF.render.update(0,p.pos);
    return true;
  }
  SF.shots={active:number>=0,number:number,stage:apply};
}());
