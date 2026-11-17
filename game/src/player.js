'use strict';
// Dario Venn: camera-relative movement, melee and the unlocked courier pistol.
SF.initPlayer=function(){
 const group=new THREE.Group(),shirt=SF.material(0xe7b07a),pants=SF.material(0x293d50),skin=SF.material(0xc58d69),bag=SF.material(0x557d70);
 function part(x,y,z,w,h,d,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;}
 part(0,1.15,0,.65,.8,.38,shirt);part(0,1.83,0,.4,.43,.4,skin);part(0,1.22,-.28,.58,.62,.23,bag);part(-.44,1.12,0,.2,.73,.24,shirt);part(.44,1.12,0,.2,.73,.24,shirt);
 const left=part(-.19,.43,0,.25,.84,.3,pants),right=part(.19,.43,0,.25,.84,.3,pants);
 SF.scene.add(group);SF.player={x:SF.C.start.x,z:SF.C.start.z,angle:Math.PI,mesh:group,left:left,right:right,cooldown:0,gun:false,moving:0};
 const flash=SF.flash=new THREE.Mesh(new THREE.OctahedronGeometry(.23),new THREE.MeshBasicMaterial({color:0xffe19a}));flash.visible=false;SF.scene.add(flash);
 SF.tracers=[];for(let i=0;i<12;i++){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));const mesh=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xffdc8a}));mesh.frustumCulled=false;mesh.visible=false;SF.scene.add(mesh);SF.tracers.push({mesh:mesh,life:0});}
};
SF.trace=function(x,y,z,tx,ty,tz,color){let t=SF.tracers[0];for(let i=0;i<12;i++)if(SF.tracers[i].life<=0){t=SF.tracers[i];break;}const a=t.mesh.geometry.attributes.position;a.setXYZ(0,x,y,z);a.setXYZ(1,tx,ty,tz);a.needsUpdate=true;t.mesh.material.color.setHex(color);t.mesh.visible=true;t.life=.09;};
SF.attack=function(melee){
 const p=SF.player;if(p.cooldown>0||SF.car)return;p.cooldown=melee?.5:.25;
 const gun=!melee&&p.gun,range=gun?85:2.8;const ax=Math.sin(SF.input.yaw),az=Math.cos(SF.input.yaw);p.angle=SF.input.yaw;
 let target=null,best=range;
 for(let i=0;i<SF.peds.length;i++){const q=SF.peds[i];if(!q.active||q.health<=0)continue;const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz),along=dx*ax+dz*az,side=Math.abs(dx*az-dz*ax);if(d<best&&along>0&&side<(gun?1.7:1.5)&&SF.lineClear(p.x,p.z,q.x,q.z)){target=q;best=d;}}
 if(target)SF.hurtPed(target,gun?55:40);
 SF.frighten(p.x,p.z);SF.audio.tone(gun?95:140,gun?.12:.08,.12);
 if(gun){SF.crime(1,false);let length=range;for(let d=1;d<range;d+=1)if(SF.solid(p.x+ax*d,p.z+az*d,0)){length=d;break;}if(target)length=best;
 SF.trace(p.x+ax*.6,1.5,p.z+az*.6,p.x+ax*length,1.4,p.z+az*length,0xffe3a0);SF.flash.position.set(p.x+ax*.8,1.5,p.z+az*.8);SF.flash.visible=true;SF.flashUntil=SF.time+.06;
 }else SF.message(target?'Hit!':'Punch — get close and face your target.',1);
};
SF.updatePlayer=function(dt){const p=SF.player,k=SF.input.keys;p.cooldown=Math.max(0,p.cooldown-dt);
 if(SF.input.take('KeyE'))SF.enterExit();if(SF.input.take('KeyQ')&&SF.story>0){p.gun=!p.gun;SF.message(p.gun?'Pistol equipped. Click to fire. Q to holster.':'Fists equipped.');}
 if(!SF.car){let forward=(k.KeyW?1:0)-(k.KeyS?1:0),side=(k.KeyD?1:0)-(k.KeyA?1:0);const magnitude=Math.hypot(forward,side);if(magnitude){forward/=magnitude;side/=magnitude;const a=SF.input.yaw,s=k.ShiftLeft||k.ShiftRight?8:4.3,dx=(Math.sin(a)*forward-Math.cos(a)*side)*s*dt,dz=(Math.cos(a)*forward+Math.sin(a)*side)*s*dt;SF.move(p,dx,dz,.4);p.angle=Math.atan2(dx,dz);p.moving+=dt*s;}p.mesh.position.set(p.x,0,p.z);p.mesh.rotation.y=p.angle;p.left.rotation.x=magnitude?Math.sin(p.moving*2)*.55:0;p.right.rotation.x=-p.left.rotation.x;
 if(SF.input.fire)SF.attack(false);if(SF.input.take('KeyF'))SF.attack(true);
 if(SF.input.take('KeyR')){if(SF.dist(p,SF.C.food)<12){if(SF.cash>=25){SF.cash-=25;SF.health=100;SF.message('Hot meal. Health restored.');SF.save();}else SF.message('A meal costs $25.');}else if(SF.dist(p,SF.C.hideout)<13){SF.save();SF.message('Safehouse saved. Welcome home, Dario.');}else SF.message('R: buy food at the green cross or save at home.');}
 }
 for(let i=0;i<12;i++){const t=SF.tracers[i];if(t.life>0){t.life-=dt;if(t.life<=0)t.mesh.visible=false;}}if(SF.time>SF.flashUntil)SF.flash.visible=false;
 if(SF.health<=0)SF.respawn('WASTED');
};
