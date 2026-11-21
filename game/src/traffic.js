(function () {
  'use strict';
  const SF=window.SF, T=window.THREE, moving=[];
  let grid,initialized=false;
  function route(car,nearPlayer=false) {
    const A=SF.actors,p=SF.player.position,axis=A.rand()<.5?'x':'z',direction=A.rand()<.5?-1:1;
    const fixed=A.pick(axis==='x'?grid.zs:grid.xs),range=axis==='x'?grid.xs:grid.zs;
    const coordinate=nearPlayer ? A.clamp((axis==='x'?p.x:p.z)+(A.rand()<.5?-1:1)*(85+A.rand()*130),range[0],range[range.length-1]) : A.pick(range);
    car.mesh.position.set(axis==='x'?coordinate:fixed+direction*2.4,0,axis==='x'?fixed-direction*2.4:coordinate);
    car.mesh.rotation.y=axis==='x'?direction*Math.PI/2:direction===1?0:Math.PI;
    car.route={axis,direction,fixed,cruise:7+A.rand()*8,lastCross:null}; car.speed=car.route.cruise*.6; car.traffic=true;car.mesh.visible=true;
  }
  SF.traffic={
    cars:moving,
    init(scene=SF.actors.scene()) {
      if(initialized || !scene || !SF.vehicles) return this;
      initialized=true;grid=SF.actors.grid();
      const config=SF.CONFIG || {},density=config.density || config.DENSITY || {};
      const count=SF.actors.clamp(Number(density.trafficCount || config.TRAFFIC_COUNT)||56,32,96);
      for(let i=0;i<count;i++) {const car=SF.vehicles.create(SF.actors.pick(SF.vehicles.types),{scene});route(car,i<Math.floor(count*.65));moving.push(car);}
      return this;
    },
    update(dt) {
      if(!initialized) this.init(); if(!initialized || !SF.player.mesh) return;
      const A=SF.actors,p=SF.player.position;dt=A.clamp(dt,0,.05);
      for(const car of moving) {
        if(!car.traffic || car.driver) continue;
        const r=car.route,pos=car.mesh.position,dist=pos.distanceTo(p),coords=r.axis==='x'?grid.xs:grid.zs,c=pos[r.axis];
        const next=coords.filter(v=>(v-c)*r.direction>0).sort((a,b)=>Math.abs(a-c)-Math.abs(b-c))[0];
        let desired=r.cruise;
        if(Number.isFinite(next) && Math.abs(next-c)<13) desired*=.55;
        const forward=new T.Vector3(Math.sin(car.mesh.rotation.y),0,Math.cos(car.mesh.rotation.y));
        const relative=new T.Vector3().subVectors(p,pos),ahead=relative.dot(forward),lateral=Math.abs(relative.x*forward.z-relative.z*forward.x);
        if(ahead>0 && ahead<20 && lateral<4) desired*=A.clamp((ahead-4)/16,0,1);
        for(const other of moving) {if(other===car || !other.traffic) continue; const dx=other.mesh.position.x-pos.x,dz=other.mesh.position.z-pos.z,a=dx*forward.x+dz*forward.z,l=Math.abs(dx*forward.z-dz*forward.x);if(a>0 && a<12 && l<2.5) desired=Math.min(desired,Math.max(0,(a-5)*.9));}
        car.speed+=(desired-car.speed)*Math.min(1,dt*2.5);
        const old=pos[r.axis];
        pos.x+=Math.sin(car.mesh.rotation.y)*car.speed*dt;pos.z+=Math.cos(car.mesh.rotation.y)*car.speed*dt;
        car.wheels.forEach(w=>w.rotation.x+=car.speed*dt/.34);
        car.lamps.forEach(l=>l.material=desired<2?car.brakeMaterial:car.baseTail);
        if(Number.isFinite(next) && (next-old)*r.direction>=0 && (next-pos[r.axis])*r.direction<=0 && r.lastCross!==next) {
          r.lastCross=next;
          if(A.rand()<.3) {
            const oldAxis=r.axis,oldFixed=r.fixed;r.axis=oldAxis==='x'?'z':'x';r.fixed=next;r.direction=A.rand()<.5?-1:1;
            pos[r.axis]=oldFixed;pos[oldAxis]=next+r.direction*(oldAxis==='x'?2.4:-2.4);
            car.mesh.rotation.y=r.axis==='x'?r.direction*Math.PI/2:r.direction===1?0:Math.PI;r.lastCross=oldFixed;
          }
        }
        if(dist>300 || !Number.isFinite(next)) {
          // Keep distant recycling outside the camera's immediate neighbourhood.
          if(dist>90) route(car,true); else {r.direction*=-1;car.mesh.rotation.y+=Math.PI;}
        }
      }
    }
  };
})();
