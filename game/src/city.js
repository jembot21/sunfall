'use strict';
// Solano Bay: a connected street grid, six distinct districts and the western coast.
SF.createCity=function(){
 const box=new THREE.BoxGeometry(1,1,1), roads=[],curbs=[],marks=[],buildings=[],windows=[],roofs=[],trunks=[],fronds=[],lamps=[],sand=[],props=[];
 SF.batch(box,SF.material(0xc6b38d),[[0,-.6,0,445,1,445]],false);
 sand.push([-246,-.27,0,49,.5,455]);SF.batch(box,SF.material(0xeed9a4),sand,false);
 for(const a of SF.C.roads){roads.push([a,.015,0,15,.1,440],[0,.016,a,440,.1,15]);curbs.push([a-9,.13,0,2.4,.28,440],[a+9,.13,0,2.4,.28,440],[0,.13,a-9,440,.28,2.4],[0,.13,a+9,440,.28,2.4]);for(let b=-213;b<220;b+=12){let crossing=false;for(const k of SF.C.roads)if(Math.abs(b-k)<11)crossing=true;if(!crossing)marks.push([a,.08,b,.22,.02,4],[b,.08,a,4,.02,.22]);}}
 SF.batch(box,SF.material(0xa6a5a0),curbs,false);SF.batch(box,SF.material(0x34434c),roads,false);SF.batch(box,SF.material(0xe5ce8c),marks,false);
 for(let ix=0;ix<6;ix++)for(let iz=0;iz<6;iz++){
 const cx=-160+ix*64,cz=-160+iz*64;
 // Open lots at the marina, mission yard, park and community services.
 if((ix===0&&iz<2)||(ix===5&&iz===5)||(ix===1&&iz===3)||(ix===2&&iz===4))continue;
 for(let q=0;q<4;q++){
 const x=cx+(q%2?12:-12),z=cz+(q>1?12:-12),downtown=ix>=3&&iz<=2;
 const h=downtown?SF.range(24,78):SF.range(5,17),w=SF.range(14,19),d=SF.range(14,19);
 const palette=downtown?[0xc88765,0x659b9c,0xc4a36e,0xb67875,0x829e91]:[0xe3ad78,0xc88869,0xcbb994,0xb97268,0x8eafa0];
 buildings.push([x,h/2,z,w,h,d,0,0,0,palette[Math.floor(SF.random()*palette.length)]]);SF.boxes.push({x:x,z:z,w:w/2,d:d/2});roofs.push([x,h+.3,z,w+1,.6,d+1]);
 for(let y=3;y<h-1;y+=4)for(let v=-1;v<=1;v++){windows.push([x+v*w*.26,y,z-d/2-.03,w*.17,1.45,.06],[x+v*w*.26,y,z+d/2+.03,w*.17,1.45,.06],[x-w/2-.03,y,z+v*d*.26,.06,1.45,d*.17],[x+w/2+.03,y,z+v*d*.26,.06,1.45,d*.17]);}
 }
 }
 SF.batch(box,SF.material(0xffffff),buildings,true);SF.batch(box,SF.material(0x424b50),roofs,false);
 SF.batch(box,SF.material(0x244b59,{emissive:0x629caa,emissiveIntensity:.3,roughness:.28,metalness:.35}),windows,false);
 for(let x=-203;x<=202;x+=64)for(let z=-210;z<220;z+=23){
 trunks.push([x,3.6,z,.45,7.2,.45,0,.1,0]);
 for(let k=0;k<10;k++){const a=k*Math.PI*2/10;fronds.push([x+Math.sin(a)*1.5,7.1,z+Math.cos(a)*1.5,1.05,.16,3.8,.24,a,0]);fronds.push([x+Math.sin(a)*3.1,6.3,z+Math.cos(a)*3.1,.68,.12,2.2,.65,a,0]);}
 if(z%2===0)lamps.push([x+3,3,z,.18,6,.18]);
 }
 SF.batch(new THREE.CylinderGeometry(.65,1,1,5),SF.material(0x8b7252),trunks,true);SF.batch(box,SF.material(0x205b3d),fronds,false);SF.batch(box,SF.material(0x465257),lamps,false);
 // Pier planks and simple moored sailboats, all batched.
 const docks=[],hulls=[],sails=[];
 for(let z=-174;z<-65;z+=32){docks.push([-246,.3,z,55,.6,3]);for(let x=-230;x>-270;x-=17){hulls.push([x,.7,z-6,4,1.4,9]);sails.push([x,5,z-6,.15,8,4,0,0,.22]);}}
 SF.batch(box,SF.material(0x997854),docks,false);SF.batch(new THREE.SphereGeometry(1,6,4),SF.material(0xf6ead0),hulls,false);SF.batch(box,SF.material(0xf6e5bd),sails,false);
 const ocean=SF.ocean=new THREE.Mesh(new THREE.PlaneGeometry(800,1500),new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float time;varying vec3 p;void main(){float s=pow(max(0.,sin(p.x*.9+p.y*.45+time*1.6)*sin(p.y*.8-time)),12.);gl_FragColor=vec4(vec3(.08,.37,.43)+s*vec3(.72,.52,.28),1.);}'}));ocean.rotation.x=-Math.PI/2;ocean.position.set(-666,-.15,0);SF.scene.add(ocean);
 // Beach umbrellas, food kiosk, lot barriers and far skyline silhouettes.
 for(let z=-30;z<205;z+=19){props.push([-237,1,z,.12,2,.12]);}
 SF.batch(box,SF.material(0xed9c62),props,false);
 const umbrellas=[];for(let z=-30;z<205;z+=19)umbrellas.push([-237,2.2,z,3,.65,3,0,0,0,z%3?0xf1b573:0x73c7bc]);SF.batch(new THREE.ConeGeometry(1,1,8),SF.material(0xffffff),umbrellas,false);
 SF.batch(box,SF.material(0xe68557),[[-58,1.5,75,7,3,5],[-185,2,-115,11,4,9]],true);
 SF.batch(box,SF.material(0x344b50),[[-203,4.4,32,.4,8.8,.4],[-181,4.4,32,.4,8.8,.4],[-192,10.4,32,23,.35,.4]],false);
 SF.label('SOLANO BAY',-192,9,32,'#ffd89b',22);SF.label('AFTERGLOW',98,10,21,'#ff76b5',17);SF.label('NIGHT MARKET',157,7,20,'#6fffe0',17);SF.label('HARBOR CLUB',-166,5,-140,'#ffcc82',18);SF.label('BAY MEDICAL',-178,6,83,'#9af5d2',16);SF.label('FOOD $25',-58,4,78,'#f9f0aa',8);SF.label('VENN / SAFEHOUSE',-185,5,-109,'#c9e7d9',15);
 const skyline=[];for(let i=0;i<32;i++)skyline.push([SF.range(-80,340),15,SF.range(-340,-290),SF.range(9,20),SF.range(20,70),15]);SF.batch(box,SF.material(0x9e9398),skyline,false);
 SF.landmarks=[{x:-64,z:64,type:'food'},{x:-192,z:-128,type:'home'}];
};
