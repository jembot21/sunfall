'use strict';
// Spatial collision and shared instancing helpers. Static boxes also block sight and bullets.
SF.boxes=[];
SF.material=function(color,extra){return new THREE.MeshStandardMaterial(Object.assign({color:color,roughness:.82},extra));};
SF.batch=function(geometry,material,items,shadow){
 const mesh=new THREE.InstancedMesh(geometry,material,items.length);const d=SF.temp;
 for(let i=0;i<items.length;i++){const a=items[i];d.position.set(a[0],a[1],a[2]);d.rotation.set(a[6]||0,a[7]||0,a[8]||0);d.scale.set(a[3],a[4],a[5]);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);if(a[9]!==undefined)mesh.setColorAt(i,new THREE.Color(a[9]));}
 mesh.castShadow=!!shadow;mesh.receiveShadow=true;SF.scene.add(mesh);return mesh;
};
SF.solid=function(x,z,r){if(x < -221+r||x>218-r||z < -220+r||z>220-r)return true;for(let i=0;i<SF.boxes.length;i++){const b=SF.boxes[i];if(x>b.x-b.w-r&&x<b.x+b.w+r&&z>b.z-b.d-r&&z<b.z+b.d+r)return true;}return false;};
SF.lineClear=function(ax,az,bx,bz){const n=Math.ceil(Math.hypot(bx-ax,bz-az)/4);for(let i=1;i<n;i++)if(SF.solid(ax+(bx-ax)*i/n,az+(bz-az)*i/n,0))return false;return true;};
SF.move=function(o,dx,dz,r){let hit=false;if(!SF.solid(o.x+dx,o.z,r))o.x+=dx;else hit=true;if(!SF.solid(o.x,o.z+dz,r))o.z+=dz;else hit=true;return hit;};
SF.label=function(text,x,y,z,color,width){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#172b35';ctx.fillRect(0,0,512,96);ctx.font='bold 54px sans-serif';ctx.textAlign='center';ctx.fillStyle=color||'#ffd88a';ctx.fillText(text,256,67);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;const m=new THREE.Mesh(new THREE.PlaneGeometry(width||14,2.6),new THREE.MeshBasicMaterial({map:t,side:THREE.FrontSide}));m.position.set(x,y,z);const back=new THREE.Mesh(m.geometry,m.material);back.rotation.y=Math.PI;back.position.z=-.04;m.add(back);SF.scene.add(m);return m;};
SF.respawn=function(reason){SF.health=100;SF.cash=Math.max(0,SF.cash-150);SF.car=null;SF.player.mesh.visible=true;const at=reason==='BUSTED'?SF.C.station:SF.C.hospital;SF.player.x=at.x;SF.player.z=at.z;SF.clearWanted();SF.missions.retry();SF.message(reason+' — $150 deducted. Your job can be retried.',7);SF.save();};
