(function () {
  'use strict';
  var query=new URLSearchParams(window.location.search),raw=query.get('shot');
  var number=raw!==null&&/^[0-3]$/.test(raw)?Number(raw):-1;
  function stage(){
    if(number<0)return false;SF.random.reseed(5);SF.police.reset();var p=SF.player;
    p.respawn(0);p.cash=18450;p.rep=1720;p.health=94;p.armour=76;
    var x=number===0||number===3?123:number===1?41:-205,z=number===0?35:number===1?-65:number===2?-55:30;
    p.pos.set(x,0,z);p.yaw=number===0||number===3?Math.PI:0;
    for(var i=1;i<5;i++)SF.weapons.unlock(i);
    if(number===1||number===2){var car=SF.vehicles.create(x,z,0,0);p.enterCar(car);car.stolen=true;car.speed=number===1?39:31;car.vz=car.speed;}
    var forward=number===0||number===3?-1:1;
    for(var n=0;n<14;n++){
      var pedestrian=SF.peds.list[n],px=x+(n%2?11:-11),pz=z+forward*(8+Math.floor(n/2)*8);
      pedestrian.pos.set(px,0,pz);pedestrian.home=px;pedestrian.mesh.rotation.y=n%2?0:Math.PI;pedestrian.mesh.visible=true;
      SF.peds.animate(pedestrian.mesh,n*0.7,0.5,false);
    }
    for(var t=0;t<8;t++){
      var traffic=SF.traffic.fleet[t].car;traffic.reset(x+(t%2?4:-4),z+forward*(13+Math.floor(t/2)*14),t%2?Math.PI:0);traffic.driver='ai';traffic.speed=16;
    }
    if(number===2){
      SF.police.air.altitude=24;SF.police.addHeat(SF.CONFIG.wantedThresholds[4]);SF.police.update(0);
      for(var c=0;c<3;c++){var unit=SF.police.units[c];if(unit.car){unit.car.reset(x+(c-1)*6,z-14-c*10,0);unit.car.driver='cop';unit.pos.copy(unit.car.pos);unit.active=true;}}
      SF.police.seenPlayer=true;
    }
    if(number===3){
      SF.hud.say('Lena Voss','Wheelwoman','Dario, they are moving the ledger. Clear the street — I have your exit.');
      SF.missions.start(SF.missions.list[3]);SF.weapons.equip(2);p.yaw=Math.PI;p.update(0);
    }else {SF.missions.update(0.15);}
    var camera=SF.render.camera;
    if(number===0){camera.position.set(x+7,5,z+12);camera.lookAt(x,1.6,z-27);}
    if(number===1){camera.position.set(x-7,5.2,z-13);camera.lookAt(x,1.5,z+30);}
    if(number===2){camera.position.set(x-15,7,z-42);camera.lookAt(x,2,z+19);}
    if(number===3){camera.position.set(x+4,3.4,z+8);camera.lookAt(x,1.3,z-22);}
    document.getElementById('start-screen').style.display='none';SF.hud.setClock(4,'18:12');SF.hud.refresh();SF.render.update(0,p.pos);return true;
  }
  SF.shots={active:number>=0,number:number,stage:stage};
}());
