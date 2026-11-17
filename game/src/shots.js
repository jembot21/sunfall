'use strict';
// Presentation staging only: pooled citizens, road traffic and real pursuit AI remain live.
SF.stageShot=function(name){
 if(!['chase','downtown','coast','end'].includes(name))return;
 SF.begin(false,false);
 const coast=name==='coast',end=name==='end',chase=name==='chase';
 const x=coast?-195.2:end?-195.2:60.8,z=coast?8:end?-102:-78;
 function place(c,x,z,a,speed){c.x=x;c.z=z;c.angle=a;c.speed=speed;c.initialized=false;c.mesh.position.set(x,0,z);c.mesh.rotation.y=a;}
 SF.car=SF.starter;SF.starter.stolen=true;SF.player.mesh.visible=false;
 place(SF.car,x,z,0,chase?23:12);SF.player.x=x;SF.player.z=z;SF.input.yaw=0;
 // Initialize a straight lane in the existing graph; subsequent junctions use normal AI.
 let n=0;for(let i=0;i<SF.cars.length&&n<6;i++){
 const c=SF.cars[i];if(c.kind!=='traffic')continue;
 const opposite=n%2===1,offset=[25,40,59,-42,85,-67][n];
 place(c,x+(opposite?6.4:0),z+offset,opposite?Math.PI:0,opposite?11:14);
 c.initialized=true;c.nodeX=coast||end?0:4;c.nodeZ=SF.clamp(Math.round((c.z+192)/64),0,6);c.dir=opposite?2:0;c.tx=c.x;c.tz=opposite?-192:192;n++;
 }
 for(let i=0;i<18;i++){
 const p=SF.peds[i];p.x=x+(i%2?13.7:-7.3);p.z=z-16+Math.floor(i/2)*8;p.homeX=p.x;p.homeZ=p.z;p.tx=p.x;p.tz=p.z+10;p.fear=0;
 }
 if(end){SF.story=5;SF.cash=5080;SF.missions.retry();}
 else{SF.story=0;SF.missions.retry();SF.missions.update(0);}
 if(chase){
 SF.crime(3,false);
 // Ask the police system to activate its own pooled pursuit cars, then stage behind us.
 for(let i=0;i<2;i++){SF.policeSpawn=0;SF.updatePolice(0);}
 n=0;for(let i=0;i<SF.cars.length;i++){const c=SF.cars[i];if(c.kind==='police'&&c.active){place(c,x+(n?4.5:0),z-11-n*8,0,24);n++;}}
 SF.policeSpawn=8;
 }
 SF.shotView=chase?{distance:17,height:3.1,yaw:.32}:coast?{distance:12,height:4.4,yaw:.35}:end?{distance:21,height:9,yaw:1.15}:{distance:13,height:4.5,yaw:-.38};
 SF.camera.position.set(x-Math.sin(SF.shotView.yaw)*SF.shotView.distance,SF.shotView.height,z-Math.cos(SF.shotView.yaw)*SF.shotView.distance);
 SF.paintPeds();SF.updateCamera(0);SF.updateHUD();SF.message('',0);
};
