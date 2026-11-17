'use strict';
// Cardinal street graph and right-hand lanes. Decisions are staggered, physics remains smooth.
SF.initRoute=function(c){const roads=SF.C.roads;let ix=0,iz=0;for(let i=1;i<7;i++){if(Math.abs(roads[i]-c.x)<Math.abs(roads[ix]-c.x))ix=i;if(Math.abs(roads[i]-c.z)<Math.abs(roads[iz]-c.z))iz=i;}c.nodeX=ix;c.nodeZ=iz;c.initialized=true;SF.chooseRoad(c);};
SF.chooseRoad=function(c){
 const roads=SF.C.roads;let best=-1,score=1e9;
 for(let d=0;d<4;d++){const nx=c.nodeX+(d===1?1:d===3?-1:0),nz=c.nodeZ+(d===0?1:d===2?-1:0);if(nx<0||nx>6||nz<0||nz>6)continue;let s=SF.random()*90;if(c.kind==='police')s=Math.abs(roads[nx]-SF.player.x)+Math.abs(roads[nz]-SF.player.z)+SF.random()*22;if(d===(c.dir+2)%4)s+=180;if(s<score){score=s;best=d;}}
 if(best<0)best=(c.dir+2)%4;c.dir=best;c.nodeX+=best===1?1:best===3?-1:0;c.nodeZ+=best===0?1:best===2?-1:0;
 // Right side relative to the positive-Z forward convention.
 c.tx=roads[c.nodeX]+(best===0? -3.2:best===2?3.2:0);c.tz=roads[c.nodeZ]+(best===1?3.2:best===3?-3.2:0);
};
SF.aiDrive=function(c,dt,pursuit){
 if(!c.initialized)SF.initRoute(c);
 if(Math.hypot(c.x-c.tx,c.z-c.tz)<7)SF.chooseRoad(c);
 let tx=c.tx,tz=c.tz;
 if(pursuit&&SF.dist(c,SF.player)<65&&SF.lineClear(c.x,c.z,SF.player.x,SF.player.z)){tx=SF.player.x;tz=SF.player.z;}
 const desired=Math.atan2(tx-c.x,tz-c.z),delta=SF.angle(desired-c.angle);
 c.think-=dt;
 if(c.think<=0){c.think=SF.dist(c,SF.player)>110?.45:.11;c.throttle=1;
 const stopping=7+Math.abs(c.speed)*.65,fx=Math.sin(c.angle),fz=Math.cos(c.angle);
 for(let i=0;i<SF.cars.length;i++){const o=SF.cars[i];if(o===c||!o.active||(pursuit&&o===SF.car))continue;const dx=o.x-c.x,dz=o.z-c.z,ahead=dx*fx+dz*fz,side=Math.abs(dx*fz-dz*fx);if(ahead>0&&ahead<stopping&&side<2.5)c.throttle=-.8;}
 if(!SF.car&&!pursuit){const dx=SF.player.x-c.x,dz=SF.player.z-c.z;if(dx*fx+dz*fz>0&&Math.hypot(dx,dz)<stopping&&Math.abs(dx*fz-dz*fx)<2.5)c.throttle=-1;}
 }
 let targetSpeed=pursuit?25:11+(c.nodeX%3)*2;if(Math.abs(delta)>.6)targetSpeed=7;if(pursuit&&SF.dist(c,SF.player)<6)targetSpeed=SF.car?14:0;
 const throttle=c.throttle<0?(c.speed>0?c.throttle:0):c.speed<targetSpeed?1:0;
 SF.driveCar(c,dt,throttle,SF.clamp(delta*2.8,-1,1),c.speed>targetSpeed+2);
 // Recovery from static corners, without teleporting near the player.
 if(Math.abs(c.speed)<.2&&Math.abs(delta)>1.5){c.angle+=SF.clamp(delta,-1,1)*dt*1.4;}
};
SF.updateTraffic=function(dt){for(let i=0;i<SF.cars.length;i++){const c=SF.cars[i];if(c.active&&c!==SF.car&&c.kind==='traffic')SF.aiDrive(c,dt,false);}};
