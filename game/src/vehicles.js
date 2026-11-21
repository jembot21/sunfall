(function () {
  'use strict';
  const SF=window.SF, T=window.THREE;
  const specifications = [
    ['Vireo Coupe',24,9,2.1,3.9],['Meridian Sedan',22,7,1.8,4.5],['Solano Cab',21,7,1.7,4.5],
    ['Hauler Pickup',20,6,1.5,4.9],['Cargo Van',17,5,1.25,5.2],['Tide Runner GT',34,12,2.5,4.2]
  ];
  const colors=[0xb7c9c7,0xe0c5a1,0x607c89,0xa95441,0xd9d6cb,0x323f53,0x84936b,0xc2a050];
  const cars=[], parked=[], plateMaterials=[];
  let ready=false, sharedPlateGeometry, wheelGeometry;
  function setup() {
    if(ready) return; ready=true;
    sharedPlateGeometry=new T.PlaneGeometry(.62,.22); wheelGeometry=new T.CylinderGeometry(.34,.34,.23,12); wheelGeometry.rotateZ(Math.PI/2);
    const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=128;
    const ctx=canvas.getContext('2d'), codes=['SLN-204','BAY-718','PAL-392','SOL-581','SUN-846','TDE-063','MRD-427','VRO-159'];
    codes.forEach((code,i) => {
      const x=(i%4)*128,y=Math.floor(i/4)*64;
      ctx.fillStyle='#f2e7c9'; ctx.fillRect(x,y,128,64); ctx.strokeStyle='#244d5e'; ctx.lineWidth=3; ctx.strokeRect(x+3,y+3,122,58);
      ctx.textAlign='center'; ctx.fillStyle='#ac5139'; ctx.font='bold 10px sans-serif'; ctx.fillText('SOLANO BAY',x+64,y+16);
      ctx.fillStyle='#163443'; ctx.font='bold 23px monospace'; ctx.fillText(code,x+64,y+43);
    });
    const atlas=new T.CanvasTexture(canvas); if(T.SRGBColorSpace) atlas.colorSpace=T.SRGBColorSpace;
    // One GPU texture; UVs select one of eight entries. Materials are shared too.
    const mat=new T.MeshStandardMaterial({map:atlas,roughness:.7});
    codes.forEach((_,i) => {
      const g=sharedPlateGeometry.clone(), uv=g.attributes.uv;
      for(let n=0;n<uv.count;n++) uv.setXY(n,(i%4+uv.getX(n))/4,(1-Math.floor(i/4)+uv.getY(n))/2);
      plateMaterials.push({geometry:g,material:mat});
    });
  }
  function spec(type) {
    const configured=(SF.CONFIG || {}).VEHICLE_TYPES;
    const entries=Array.isArray(configured) ? configured : Object.values(configured || {});
    const name=typeof type==='string' ? type : type && (type.name || type.displayName);
    const base=specifications.find(s => s[0]===name) || specifications[0];
    const extra=entries.find(e => e && (e.name===base[0] || e.displayName===base[0])) || {};
    return {name:base[0], maxSpeed:Number(extra.maxSpeed)||base[1],acceleration:Number(extra.acceleration)||base[2],handling:Number(extra.handling)||base[3],length:base[4]};
  }
  function build(type, options={}) {
    setup(); const A=SF.actors,s=spec(type), mesh=new T.Group(), patrol=!!options.patrol;
    const color=patrol ? 0xeee9da : options.color===undefined ? A.pick(colors) : options.color;
    A.part(mesh,[1.85,.57,s.length],[0,.78,0],color);
    A.part(mesh,[1.65,.65,s.length*.47],[0,1.35,-.15],patrol ? 0x223644 : color);
    A.part(mesh,[1.53,.4,.04],[0,1.47,s.length*.235-.12],0x42616b);
    A.part(mesh,[1.53,.4,.04],[0,1.47,-s.length*.235-.18],0x42616b);
    [-1,1].forEach(side => A.part(mesh,[.035,.42,s.length*.4],[side*.84,1.44,-.16],0x42616b));
    if(s.name==='Hauler Pickup') A.part(mesh,[1.55,.06,1.4],[0,1.09,-1.55],0x3a4141);
    if(s.name==='Cargo Van') A.part(mesh,[1.78,1.05,2.8],[0,1.52,-.9],color);
    if(s.name==='Solano Cab' && !patrol) A.part(mesh,[.65,.2,.32],[0,1.81,-.1],0xeac14a);
    const wheels=[],front=[];
    [-1,1].forEach(side => [-1,1].forEach(end => {
      const pivot=new T.Group(); pivot.position.set(side*.94,.4,end*s.length*.32); mesh.add(pivot);
      const wheel=new T.Mesh(wheelGeometry,A.material(0x202629)); pivot.add(wheel); wheels.push(wheel); if(end===1) front.push(pivot);
    }));
    const brakeMaterial=A.material(0xeb3024,true), lamps=[];
    [-1,1].forEach(side => {
      A.part(mesh,[.43,.19,.045],[side*.59,.91,s.length/2+.025],0xffe3a2,undefined,true);
      lamps.push(A.part(mesh,[.4,.16,.045],[side*.61,.88,-s.length/2-.025],0x66170e));
    });
    const plateEntry=A.pick(plateMaterials), plate=new T.Mesh(plateEntry.geometry,plateEntry.material);
    plate.position.set(0,.66,-s.length/2-.035); plate.rotation.y=Math.PI; plate.name='rear license plate'; mesh.add(plate);
    const car={mesh,type:s.name,displayName:patrol?'Solano Bay Patrol':s.name,spec:s,speed:0,steering:0,health:100,locked:false,driver:null,patrol,wheels,front,lamps,brakeMaterial,baseTail: A.material(0x66170e),flash:[],owned:false};
    if(patrol) {
      [-1,1].forEach(side => A.part(mesh,[.025,.3,1.8],[side*.94,.85,0],0x223644));
      A.part(mesh,[1.45,.1,.35],[0,1.77,-.1],0x1d2730);
      [-1,1].forEach((side,i) => {
        const color=i?0x277fff:0xff2825, lamp=A.part(mesh,[.55,.16,.3],[side*.4,1.88,-.1],color,undefined,true);
        let flare=null; if(SF.render && SF.render.makeFlare) { flare=SF.render.makeFlare(color,1.45); flare.position.copy(lamp.position); mesh.add(flare); }
        car.flash.push({lamp,flare});
      });
    }
    mesh.position.copy(A.position(options.position)); mesh.rotation.y=options.heading || 0; mesh.userData.car=car;
    cars.push(car); (options.scene || A.scene())?.add(mesh); return car;
  }
  const vehicles=SF.vehicles={
    cars,parked,colors,types:specifications.map(s=>s[0]),create:build,
    init(scene=SF.actors.scene()) { setup(); if(scene && !this.parkedReady) { this.parkedReady=true; this.populateParked(scene); } return this; },
    entryPoints(car) { return [-1,1].map(side => car.mesh.localToWorld(new T.Vector3(side*1.65,0,.35))); },
    nearest(position,radius=5) { let found=null,dist=radius; for(const car of cars) { const d=car.mesh.position.distanceTo(position); if(car.mesh.visible && d<dist) {found=car;dist=d;} } return found; },
    steal(car) {
      if(car.locked || car.driver) return false;
      if(!car.owned && SF.police) SF.police.crime('vehicle theft',car.mesh.position,1);
      car.owned=true; car.traffic=false; car.parked=false;
      if(car.parkingBatch) { car.parkingBatch.hide(car.parkingIndex); car.parkingBatch=null; }
      car.mesh.visible=true; return true;
    },
    drive(car,dt,input={}) {
      const A=SF.actors; dt=A.clamp(dt,0,.05);
      const throttle=A.clamp(Number(input.throttle)||0,-1,1),brake=!!input.brake;
      car.speed+=throttle*car.spec.acceleration*dt;
      car.speed*=Math.exp(-(brake?5:throttle?.12:1.2)*dt);
      car.speed=A.clamp(car.speed,-car.spec.maxSpeed*.38,car.spec.maxSpeed);
      car.steering+=(A.clamp(Number(input.steer)||0,-1,1)*.48-car.steering)*Math.min(1,dt*8);
      car.mesh.rotation.y+=car.steering*car.speed/car.spec.length*car.spec.handling*dt;
      car.mesh.position.x+=Math.sin(car.mesh.rotation.y)*car.speed*dt; car.mesh.position.z+=Math.cos(car.mesh.rotation.y)*car.speed*dt;
      const b=A.bounds(),p=car.mesh.position;
      if(p.x<b.minX+2 || p.x>b.maxX-2 || p.z<b.minZ+2 || p.z>b.maxZ-2) {p.x=A.clamp(p.x,b.minX+2,b.maxX-2);p.z=A.clamp(p.z,b.minZ+2,b.maxZ-2);car.speed*=-.2;}
      car.front.forEach(w=>w.rotation.y=car.steering); car.wheels.forEach(w=>w.rotation.x+=car.speed*dt/.34);
      car.lamps.forEach(l=>l.material=brake || throttle<0 ? car.brakeMaterial : car.baseTail);
      if(car.health<=0) car.speed*=Math.exp(-8*dt);
    },
    damage(car,amount) {car.health=Math.max(0,car.health-amount);car.hitTime=.25;},
    update(dt,time) {
      this.clock=(this.clock || 0)+Math.min(dt,.05); const now=Number.isFinite(time)?time:this.clock;
      cars.forEach(car=> {
        car.flash.forEach((f,i)=>{const on=(Math.floor(now*7)%2)===i; f.lamp.visible=on; if(f.flare) {f.flare.visible=on; f.flare.scale.setScalar(on?1.2:0.01);} });
        if(car.hitTime>0) {car.hitTime-=dt;car.mesh.rotation.z=Math.sin(car.hitTime*45)*.018;} else car.mesh.rotation.z=0;
      });
    },
    populateParked(scene) {
      const A=SF.actors, raw=(SF.world || {}).parkingSpots || (SF.city || {}).parkingSpots || [], spots=Array.isArray(raw)?raw:[];
      if(!spots.length) { const g=A.grid(); g.xs.forEach(x=>g.zs.slice(0,-1).forEach((z,i)=>{for(let k=0;k<3;k++) spots.push({x:x+7,z:z+15+k*7,heading:i%2?0:Math.PI});})); }
      const selected=spots.filter(()=>A.rand()<.8).slice(0,360);
      // A template per kind/color/plate bucket gives every repeated part an InstancedMesh.
      const buckets=new Map(); selected.forEach((spot,i)=> { const kind=i%6,color=colors[(kind+(Math.floor(i/6)%2)*3)%6],key=kind+':'+color; if(!buckets.has(key)) buckets.set(key,[]); buckets.get(key).push(spot); });
      buckets.forEach((list,key)=> {
        const [kind,color]=key.split(':').map(Number), template=build(specifications[kind][0],{color,scene});
        template.mesh.updateMatrixWorld(true); const batches=[];
        template.mesh.traverse(part=> { if(part.isMesh) {const instance=new T.InstancedMesh(part.geometry,part.material,list.length);instance.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(instance);batches.push({instance,local:part.matrixWorld.clone()});} });
        scene.remove(template.mesh); cars.splice(cars.indexOf(template),1);
        const dummy=new T.Object3D(), matrix=new T.Matrix4();
        const batch={ hide(index) {const zero=new T.Matrix4().makeScale(0,0,0); batches.forEach(b=>{b.instance.setMatrixAt(index,zero);b.instance.instanceMatrix.needsUpdate=true;});} };
        list.forEach((spot,index)=> {
          dummy.position.copy(A.position(spot));dummy.rotation.set(0,Number(spot.heading === undefined ? spot.rotation : spot.heading)||0,0);dummy.updateMatrix();
          batches.forEach(b=>{matrix.multiplyMatrices(dummy.matrix,b.local);b.instance.setMatrixAt(index,matrix);});
          // Parked logical cars materialize only on entry; no hidden per-car mesh allocation.
          const record={position:dummy.position.clone(),heading:dummy.rotation.y,type:template.type,batch,index,color,car:null}; parked.push(record);
        });
        batches.forEach(b=>{b.instance.instanceMatrix.needsUpdate=true;b.instance.computeBoundingSphere();});
      });
    }
  };
  const nearest=vehicles.nearest;
  vehicles.nearest=function(position,radius=5) {
    let car=nearest(position,radius),distance=car?car.mesh.position.distanceTo(position):radius,record=null;
    parked.forEach(p=>{if(!p.car && p.position.distanceTo(position)<distance){record=p;distance=p.position.distanceTo(position);}});
    if(record) {car=build(record.type,{position:record.position,heading:record.heading,color:record.color});car.mesh.visible=false;car.parked=true;car.parkingBatch=record.batch;car.parkingIndex=record.index;record.car=car;}
    return car;
  };
})();
