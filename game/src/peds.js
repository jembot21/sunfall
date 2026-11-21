(function () {
  'use strict';
  const SF=window.SF, T=window.THREE, people=[];
  const shirts=[0xb26f54,0x628d92,0xc8b67d,0x69728a,0xe6d5bc,0x7e986b],skins=[0xd4a079,0x966544,0xe2b895,0x704b38];
  let initialized=false,time=0,grid;
  function districtBounds(d) {
    const b=d.bounds || d,all=SF.actors.bounds();
    return {minX:Number.isFinite(b.minX)?b.minX:all.minX,maxX:Number.isFinite(b.maxX)?b.maxX:all.maxX,minZ:Number.isFinite(b.minZ)?b.minZ:all.minZ,maxZ:Number.isFinite(b.maxZ)?b.maxZ:all.maxZ};
  }
  function spawn(d,index,busy) {
    const A=SF.actors,b=districtBounds(d),mesh=A.figure(A.pick(shirts),A.pick(skins));
    const props=(SF.world || {}).pedestrianSpawns || (SF.city || {}).pedestrianSpawns || (SF.world || {}).props || [];
    const anchors=Array.isArray(props)?props.filter(p=>/cafe|bench|bus|beach/i.test(p.kind || p.type || p.name || '') && A.position(p).x>=b.minX && A.position(p).x<=b.maxX && A.position(p).z>=b.minZ && A.position(p).z<=b.maxZ):[];
    const vertical=index%2===0,streets=(vertical?grid.xs:grid.zs).filter(v=>v>(vertical?b.minX:b.minZ) && v<(vertical?b.maxX:b.maxZ));
    const fixed=(streets.length?A.pick(streets):(vertical?(b.minX+b.maxX)/2:(b.minZ+b.maxZ)/2))+(index%4<2?1:-1)*8;
    mesh.position.set(vertical?fixed:b.minX+A.rand()*(b.maxX-b.minX),0,vertical?b.minZ+A.rand()*(b.maxZ-b.minZ):fixed);
    if(anchors.length && (busy?index%3!==0:index%5===0)) {mesh.position.copy(A.position(anchors[Math.floor(index/4)%anchors.length]));mesh.position.x+=2+(index%4)*.9;mesh.position.z+=(Math.floor(index/4)%3)*1.2;}
    const idle=index%6===0,person={mesh,district:d.name || d.id || '',health:100,speed:idle?0:.8+A.rand()*.7,idle,axis:vertical?'z':'x',direction:A.rand()<.5?-1:1,bounds:b,flee:0,phase:A.rand()*6,reaction:0};
    mesh.rotation.y=vertical?person.direction===1?0:Math.PI:person.direction*Math.PI/2;person.parts=[];people.push(person);
  }
  SF.peds={
    people,
    init() {
      if(initialized || !SF.actors.scene()) return this;initialized=true;grid=SF.actors.grid();
      const config=SF.CONFIG || {},raw=config.DISTRICTS || config.districts || [],districts=Array.isArray(raw)?raw:Object.values(raw);
      (districts.length?districts:[{name:'Palma Strand'}]).forEach((d,i)=> {
        if(typeof d==='string') d={name:d};const busy=/palma|strand/i.test(d.name || d.id || '');
        const density=config.PED_COUNTS || config.pedestrianCounts || {};
        const amount=Number(d.pedestrianCount || d.pedCount || d.peds || density[d.name] || density[d.id]);
        const count=SF.actors.clamp(Number.isFinite(amount)?amount:busy?88:24,0,180);
        for(let n=0;n<count;n++) spawn(d,n+i*17,busy);
      });
      // Articulated figures keep their shared source geometry off-scene and render through batched parts.
      const batches=new Map();
      people.forEach(person=>person.mesh.traverse(node=>{
        if(!node.isMesh)return;
        const key=node.geometry.id+':'+node.material.id;
        if(!batches.has(key))batches.set(key,{geometry:node.geometry,material:node.material,parts:[]});
        const batch=batches.get(key),index=batch.parts.length;batch.parts.push(node);person.parts.push({node,batch,index});
      }));
      batches.forEach(batch=>{
        batch.instance=new T.InstancedMesh(batch.geometry,batch.material,batch.parts.length);
        batch.instance.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.instance.frustumCulled=false;SF.actors.scene().add(batch.instance);
      });
      this.batches=[...batches.values()];return this;
    },
    alarm(position,radius=45) {people.forEach(p=>{if(p.health>0 && p.mesh.position.distanceTo(position)<radius) {p.flee=7;p.threat=position.clone();p.idle=false;}});},
    hit(person,damage,direction) {
      if(person.health<=0) return;person.health=Math.max(0,person.health-damage);person.reaction=.4;
      if(direction) {person.mesh.position.x+=direction.x*.25;person.mesh.position.z+=direction.z*.25;}
      this.alarm(person.mesh.position,60);
      if(person.health===0) {person.mesh.rotation.z=Math.PI/2;person.mesh.position.y=.27;}
    },
    update(dt) {
      if(!initialized) this.init();dt=SF.actors.clamp(dt,0,.05);time+=dt;
      const A=SF.actors,car=SF.player && SF.player.vehicle;
      for(const p of people) {
        if(p.health<=0) {p.mesh.updateMatrixWorld(true);p.parts.forEach(part=>part.batch.instance.setMatrixAt(part.index,part.node.matrixWorld));continue;}
        if(car && Math.abs(car.speed)>8 && p.mesh.position.distanceTo(car.mesh.position)<15) {p.flee=4;p.threat=car.mesh.position.clone();p.idle=false;}
        const pos=p.mesh.position;let speed=p.speed;
        if(p.flee>0 && p.threat) {p.flee-=dt;const dx=pos.x-p.threat.x,dz=pos.z-p.threat.z,l=Math.hypot(dx,dz)||1;pos.x+=dx/l*4.6*dt;pos.z+=dz/l*4.6*dt;p.mesh.rotation.y=Math.atan2(dx,dz);speed=4.6;}
        else {pos[p.axis]+=p.direction*speed*dt;const min=p.axis==='x'?p.bounds.minX:p.bounds.minZ,max=p.axis==='x'?p.bounds.maxX:p.bounds.maxZ;if(pos[p.axis]<min+3 || pos[p.axis]>max-3) {p.direction*=-1;p.mesh.rotation.y+=Math.PI;}}
        const b=A.bounds();pos.x=A.clamp(pos.x,b.minX+2,b.maxX-2);pos.z=A.clamp(pos.z,b.minZ+2,b.maxZ-2);
        p.phase+=speed*dt*3;A.animateFigure(p.mesh,p.phase,speed,time);
        if(p.reaction>0) {p.reaction-=dt;p.mesh.rotation.x=-Math.sin(p.reaction*18)*.18;} else p.mesh.rotation.x=0;
        p.crashCooldown=Math.max(0,(p.crashCooldown || 0)-dt);
        if(car && Math.abs(car.speed)>4 && pos.distanceTo(car.mesh.position)<1.6 && p.crashCooldown===0) {p.crashCooldown=1.2;this.hit(p,Math.abs(car.speed)*6,new T.Vector3(Math.sin(car.mesh.rotation.y),0,Math.cos(car.mesh.rotation.y)));SF.police?.crime('reckless collision',pos,1);}
        p.mesh.updateMatrixWorld(true);p.parts.forEach(part=>part.batch.instance.setMatrixAt(part.index,part.node.matrixWorld));
      }
      (this.batches || []).forEach(batch=>batch.instance.instanceMatrix.needsUpdate=true);
    }
  };
})();
