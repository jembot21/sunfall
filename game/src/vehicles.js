'use strict';
// One shared, vertex-coloured car geometry; each vehicle costs one draw call.
SF.cars=[];
SF.initVehicles=function(){
 const positions=[],normals=[],colors=[];
 function part(x,y,z,w,h,d,color){const g=new THREE.BoxGeometry(w,h,d).toNonIndexed(),a=g.attributes.position,n=g.attributes.normal,c=new THREE.Color(color);for(let i=0;i<a.count;i++){positions.push(a.getX(i)+x,a.getY(i)+y,a.getZ(i)+z);normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(c.r,c.g,c.b);}g.dispose();}
 part(0,.75,0,2.05,.7,4.3,0xffffff);part(0,1.36,-.25,1.77,.65,2.05,0xa4bdc5);part(0,1.73,-.25,1.86,.12,2.15,0xffffff);part(0,.65,2.18,1.9,.17,.1,0xffedbb);part(0,.65,-2.18,1.9,.15,.1,0xd64332);
 for(const x of [-1.03,1.03])for(const z of [-1.35,1.35])part(x,.42,z,.32,.72,.72,0x202730);
 const geo=SF.carGeometry=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeBoundingSphere();
 const palette=[0xd16b48,0x4f999b,0xe7c47c,0xb0b8a8,0x8b6b8b,0xe8d4b2,0x355e74];
 for(let i=0;i<32;i++){
 const parked=i>=23, vertical=i%2===0,road=SF.C.roads[i%7],along=-174+Math.floor(i/7)*83;
 const x=vertical?road+(parked?5.3:3.3):along,z=vertical?along:road-(parked?5.3:3.3);
 SF.addCar(x,z,vertical?0:Math.PI/2,palette[i%palette.length],parked?'parked':'traffic');
 }
 SF.starter=SF.addCar(-3.5,83,0,0xeaa653,'parked');
 SF.luxury=SF.addCar(160,155,Math.PI,0xe8d38c,'luxury');SF.luxury.mesh.scale.set(1.08,1,1.16);
 for(let i=0;i<6;i++){const car=SF.addCar(0,0,0,0x52677c,'police');car.active=false;car.mesh.visible=false;const light=new THREE.Mesh(new THREE.BoxGeometry(1.5,.2,.35),SF.material(0x92bfff,{emissive:0x2255ff,emissiveIntensity:2}));light.position.set(0,1.9,0);car.mesh.add(light);car.light=light;}
};
SF.addCar=function(x,z,angle,color,kind){const mesh=new THREE.Mesh(SF.carGeometry,SF.material(color,{vertexColors:true,metalness:.25,roughness:.45}));mesh.castShadow=true;mesh.receiveShadow=true;mesh.position.set(x,0,z);mesh.rotation.y=angle;SF.scene.add(mesh);const c={x:x,z:z,angle:angle,speed:0,mesh:mesh,kind:kind,active:true,health:100,hitTime:0,stolen:false,think:0,throttle:0,steer:0,tx:0,tz:0,nodeX:0,nodeZ:0,dir:0,initialized:false,officer:null};SF.cars.push(c);return c;};
SF.enterExit=function(){
 if(SF.car){const c=SF.car;if(Math.abs(c.speed)>5){SF.message('Slow down to get out.');return;}let x=c.x+Math.cos(c.angle)*2.8,z=c.z-Math.sin(c.angle)*2.8;if(SF.solid(x,z,.4)){x=c.x-Math.cos(c.angle)*2.8;z=c.z+Math.sin(c.angle)*2.8;}if(SF.solid(x,z,.4)){SF.message('Door blocked. Move the car.');return;}SF.player.x=x;SF.player.z=z;SF.car=null;SF.player.mesh.visible=true;return;}
 let best=null,d=5;for(let i=0;i<SF.cars.length;i++){const c=SF.cars[i];if(!c.active||Math.abs(c.speed)>4)continue;const dd=SF.dist(SF.player,c);if(dd<d){d=dd;best=c;}}
 if(best){SF.car=best;SF.player.mesh.visible=false;SF.input.yaw=best.angle;best.initialized=false;if(!best.stolen){best.stolen=true;SF.crime(1,true);SF.message(best===SF.starter?'Your borrowed courier car. Follow the gold marker.':'Vehicle acquired. Keep an eye out for patrols.');}if(best===SF.luxury&&SF.story===3)SF.crime(3,false);SF.audio.tone(420,.09,.06);}
 else SF.message('Get close to a parked or stopped car, then press E.');
};
SF.driveCar=function(c,dt,throttle,steer,brake){
 const previous=c.speed;c.speed+=throttle*(throttle<0&&c.speed>1?32:18)*dt;
 c.speed*=Math.exp(-(brake?4.5:.25)*dt);c.speed=SF.clamp(c.speed,-12,c.kind==='police'?34:39);
 if(!throttle)c.speed*=Math.exp(-.45*dt);
 c.angle+=steer*dt*SF.clamp(c.speed/8,-1,1)*(1.8-Math.min(Math.abs(c.speed)/50,.65));
 const dx=Math.sin(c.angle)*c.speed*dt,dz=Math.cos(c.angle)*c.speed*dt;
 if(SF.move(c,dx,dz,1.15)){c.speed*=-.16;if(c===SF.car&&Math.abs(previous)>11&&SF.time-c.hitTime>1){SF.health-=Math.abs(previous)*.35;c.hitTime=SF.time;SF.audio.tone(65,.15,.1);}}
 c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.y=c.angle;
};
SF.updateVehicles=function(dt){
 const k=SF.input.keys,c=SF.car;
 if(c){SF.driveCar(c,dt,(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0),(k.KeyA||k.ArrowLeft?1:0)-(k.KeyD||k.ArrowRight?1:0),k.Space);SF.player.x=c.x;SF.player.z=c.z;}
 // Pair collisions include traffic and police. Only player-caused impacts are crimes.
 for(let i=0;i<SF.cars.length;i++){const a=SF.cars[i];if(!a.active)continue;for(let j=i+1;j<SF.cars.length;j++){const b=SF.cars[j];if(!b.active)continue;const dx=a.x-b.x,dz=a.z-b.z,dd=dx*dx+dz*dz;if(dd>8||dd<.001)continue;const impact=Math.abs(a.speed-b.speed);const inv=1/Math.sqrt(dd);SF.move(a,dx*inv*.11,dz*inv*.11,1);SF.move(b,-dx*inv*.11,-dz*inv*.11,1);a.speed*=.92;b.speed*=.92;if((a===c||b===c)&&impact>6&&SF.time-a.hitTime>1.5){a.hitTime=SF.time;SF.health-=impact*.24;SF.crime(1,false);SF.audio.tone(80,.12,.12);}}}
};
