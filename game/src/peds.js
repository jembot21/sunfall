'use strict';
// Instanced citizens and officers: three draws for every person in the city.
SF.peds=[];
SF.initPeds=function(){
 const palette=[0xe4a279,0x66bfc1,0xeee3bd,0xc3707a,0x4c7798,0xb8bf80];
 for(let i=0;i<100;i++){
 let x,z;do{x=SF.range(-205,205);z=SF.range(-205,205);}while(SF.solid(x,z,.5));
 if(i<80){const r=SF.C.roads[i%7];x=r+(i%2?10.5:-10.5);z=SF.range(-208,208);}
 SF.peds.push({x:x,z:z,homeX:x,homeZ:z,angle:SF.range(0,6.28),health:100,fear:0,think:0,tx:x,tz:z,officer:i>=90,active:i<90,hit:0,cooldown:0,guard:false});
 }
 // Two visible lot guards are active police even before a pursuit.
 for(let i=88;i<90;i++){const p=SF.peds[i];p.x=153+(i-88)*14;p.z=146;p.homeX=p.x;p.homeZ=p.z;p.officer=true;p.guard=true;}
 const d=SF.temp,geo=new THREE.BoxGeometry(1,1,1);
 SF.pedBodies=new THREE.InstancedMesh(geo,SF.material(0xffffff),100);SF.pedHeads=new THREE.InstancedMesh(geo,SF.material(0xc99573),100);SF.pedLegs=new THREE.InstancedMesh(geo,SF.material(0x354452),200);
 for(let i=0;i<100;i++)SF.pedBodies.setColorAt(i,new THREE.Color(SF.peds[i].officer?0x293f58:palette[i%6]));
 SF.pedBodies.castShadow=true;SF.scene.add(SF.pedBodies,SF.pedHeads,SF.pedLegs);SF.paintPeds();
};
SF.paintPeds=function(){const d=SF.temp;for(let i=0;i<SF.peds.length;i++){const p=SF.peds[i],dead=p.health<=0,visible=p.active?1:0;d.rotation.set(dead?Math.PI/2:0,p.angle,0);d.position.set(p.x,dead?.25:1.15,p.z);d.scale.set(.58*visible,.8*visible,.35*visible);d.updateMatrix();SF.pedBodies.setMatrixAt(i,d.matrix);d.position.set(p.x,dead?.25:1.84,p.z+(dead?.65:0));d.scale.set(.38*visible,.42*visible,.38*visible);d.updateMatrix();SF.pedHeads.setMatrixAt(i,d.matrix);for(let k=0;k<2;k++){d.position.set(p.x+(k?-.17:.17),dead?.2:.43,p.z+(dead?-.6:Math.sin(SF.time*6+i+k*3)*.09));d.scale.set(.22*visible,.8*visible,.25*visible);d.updateMatrix();SF.pedLegs.setMatrixAt(i*2+k,d.matrix);}}SF.pedBodies.instanceMatrix.needsUpdate=true;SF.pedHeads.instanceMatrix.needsUpdate=true;SF.pedLegs.instanceMatrix.needsUpdate=true;};
SF.frighten=function(x,z){for(let i=0;i<SF.peds.length;i++){const p=SF.peds[i];if(p.active&&Math.hypot(p.x-x,p.z-z)<65)p.fear=12;}};
SF.hurtPed=function(p,damage){if(p.health<=0)return;p.health-=damage;p.hit=SF.time;p.fear=15;SF.crime(p.officer?2:1,false);if(p.health<=0&&p.officer)SF.crime(1,false);};
SF.updatePeds=function(dt){
 for(let i=0;i<SF.peds.length;i++){const p=SF.peds[i];if(!p.active||p.health<=0)continue;
 p.fear=Math.max(0,p.fear-dt);p.cooldown-=dt;p.think-=dt;const distance=SF.dist(p,SF.player);
 if(SF.car&&Math.abs(SF.car.speed)>10&&distance<15)p.fear=5;
 if(p.think<=0){p.think=distance>100?1:.28;
 if(p.officer&&SF.wanted&&distance<45){p.tx=SF.player.x;p.tz=SF.player.z;}
 else if(p.fear&&!p.officer){const a=Math.atan2(p.x-SF.player.x,p.z-SF.player.z);p.tx=p.x+Math.sin(a)*15;p.tz=p.z+Math.cos(a)*15;}
 else if(Math.hypot(p.tx-p.x,p.tz-p.z)<2||SF.solid(p.tx,p.tz,.4)){p.tx=SF.clamp(p.homeX+SF.range(-18,18),-211,211);p.tz=SF.clamp(p.homeZ+SF.range(-35,35),-211,211);}
 }
 const a=Math.atan2(p.tx-p.x,p.tz-p.z);p.angle=a;const speed=p.fear||p.officer&&SF.wanted?3.8:1.1;
 if(!(p.officer&&SF.wanted&&distance<7)){if(SF.move(p,Math.sin(a)*speed*dt,Math.cos(a)*speed*dt,.35)){p.tx=p.homeX;p.tz=p.homeZ;}}
 if(p.officer&&SF.wanted&&distance<30&&p.cooldown<=0&&SF.lineClear(p.x,p.z,SF.player.x,SF.player.z)){p.cooldown=1.2;SF.health-=SF.car?1.8:5;SF.trace(p.x,1.6,p.z,SF.player.x,1.1,SF.player.z,0xff6254);SF.audio.tone(110,.08,.02);}
 if(SF.car&&distance<2&&Math.abs(SF.car.speed)>4&&SF.time-p.hit>1){SF.hurtPed(p,Math.abs(SF.car.speed)*8);SF.car.speed*=.85;}
 }
 SF.paintPeds();
};
