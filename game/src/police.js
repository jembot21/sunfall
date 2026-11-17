'use strict';
// Witnessed crimes, pooled pursuit units, visibility-based heat decay and detention.
SF.heat=0;SF.bust=0;SF.policeSpawn=0;SF.seen=false;
SF.crime=function(amount,witnessRequired){
 if(witnessRequired){let seen=false;for(let i=0;i<SF.cars.length;i++){const c=SF.cars[i];if(c.active&&c.kind==='police'&&SF.dist(c,SF.player)<80&&SF.lineClear(c.x,c.z,SF.player.x,SF.player.z))seen=true;}for(let i=0;i<SF.peds.length;i++){const p=SF.peds[i];if(p.active&&p.health>0&&p.officer&&SF.dist(p,SF.player)<45&&SF.lineClear(p.x,p.z,SF.player.x,SF.player.z))seen=true;}if(!seen)return;}
 // A brief reporting delay prevents a single collision or shot from counting every frame.
 if(SF.time<(SF.crimeCooldown||0))return;SF.crimeCooldown=SF.time+1.5;
 SF.wanted=SF.clamp(SF.wanted+amount,0,5);SF.heat=18;SF.frighten(SF.player.x,SF.player.z);
};
SF.clearWanted=function(){SF.wanted=0;SF.bust=0;SF.heat=0;for(let i=0;i<SF.cars.length;i++){const c=SF.cars[i];if(c.kind==='police'&&c!==SF.car){c.active=false;c.mesh.visible=false;}}for(let i=90;i<100;i++)SF.peds[i].active=false;};
SF.updatePolice=function(dt){
 if(!SF.wanted){SF.bust=Math.max(0,SF.bust-dt*.3);return;}
 SF.policeSpawn-=dt;let count=0,close=false,seen=false;
 for(let i=0;i<SF.cars.length;i++){const c=SF.cars[i];if(c.kind!=='police'||!c.active||c===SF.car)continue;count++;const d=SF.dist(c,SF.player);
 SF.aiDrive(c,dt,true);c.light.material.emissive.setHex(Math.floor(SF.time*7)%2?0xff2222:0x2255ff);
 if(d<90&&SF.lineClear(c.x,c.z,SF.player.x,SF.player.z))seen=true;
 if(d<8&&(SF.car?Math.abs(SF.car.speed)<3:true))close=true;
 if(d>180&&count>SF.wanted){c.active=false;c.mesh.visible=false;}
 }
 if(SF.policeSpawn<=0&&count<Math.min(6,SF.wanted+1)){
 SF.policeSpawn=4;for(let i=0;i<SF.cars.length;i++){const c=SF.cars[i];if(c.kind!=='police'||c.active)continue;
 let ix=0,iz=0;for(let j=1;j<7;j++){if(Math.abs(SF.C.roads[j]-SF.player.x)<Math.abs(SF.C.roads[ix]-SF.player.x))ix=j;if(Math.abs(SF.C.roads[j]-SF.player.z)<Math.abs(SF.C.roads[iz]-SF.player.z))iz=j;}
 iz=SF.clamp(iz+(SF.random()>.5?1:-1),0,6);c.x=SF.C.roads[ix]-3;c.z=SF.C.roads[iz];c.angle=Math.atan2(SF.player.x-c.x,SF.player.z-c.z);c.speed=8;c.active=true;c.health=100;c.initialized=false;c.mesh.visible=true;break;
 }
 }
 for(let i=0;i<SF.peds.length;i++){const p=SF.peds[i];if(p.active&&p.officer&&p.health>0&&SF.dist(p,SF.player)<35&&SF.lineClear(p.x,p.z,SF.player.x,SF.player.z)){seen=true;if(SF.dist(p,SF.player)<4&&!SF.car)close=true;}}
 // Officers dismount from nearby slowed patrols, reusing the reserve citizen slots.
 if((SF.frame%60)===0){for(let i=90;i<96;i++){const p=SF.peds[i],c=SF.cars[34+i-90];if(!p.active&&c&&c.active&&SF.dist(c,SF.player)<28){p.x=c.x+2.5;p.z=c.z;p.health=100;p.active=true;p.homeX=p.x;p.homeZ=p.z;}}}
 SF.seen=seen;if(seen)SF.heat=18;else SF.heat-=dt;
 if(SF.heat<=0){SF.wanted--;SF.heat=12;if(!SF.wanted){SF.clearWanted();SF.message('Heat lost. Keep it clean.',4);}}
 SF.bust=SF.clamp(SF.bust+(close?dt*.24:-dt*.18),0,1);if(SF.bust>=1)SF.respawn('BUSTED');
};
