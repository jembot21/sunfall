(function () {
  'use strict';
  const SF = window.SF = window.SF || {};
  const T = window.THREE;
  const A = SF.actors = SF.actors || {};
  const geometries = {}, materials = {};
  A.geometry = (kind = 'box') => geometries[kind] || (geometries[kind] = kind === 'sphere' ? new T.SphereGeometry(1, 10, 8) : kind === 'cylinder' ? new T.CylinderGeometry(1, 1, 1, 12) : new T.BoxGeometry(1, 1, 1));
  A.material = (color, emissive = false) => {
    const key = color + ':' + emissive;
    return materials[key] || (materials[key] = new T.MeshStandardMaterial({ color, roughness: .8, emissive: emissive ? color : 0, emissiveIntensity: emissive ? 2 : 0 }));
  };
  A.part = (parent, size, position, color, kind, emissive) => {
    const m = new T.Mesh(A.geometry(kind), A.material(color, emissive));
    m.scale.set(...size); m.position.set(...position); parent.add(m); return m;
  };
  A.scene = () => SF.render && SF.render.scene;
  A.rand = () => {
    const r=SF.random;let value=typeof r==='function'?r():r && typeof r.float==='function'?r.float(0,1):r && typeof r.next==='function'?r.next():r && typeof r.random==='function'?r.random():Math.random();
    value=Number(value);return Number.isFinite(value)?Math.max(0,Math.min(.999999999,value)):Math.random();
  };
  A.pick = list => list[Math.floor(A.rand() * list.length) % list.length];
  A.bounds = () => {
    const b = (SF.city && SF.city.bounds) || (SF.world && SF.world.bounds) || (SF.CONFIG && SF.CONFIG.bounds) || {};
    const size = Number((SF.CONFIG || {}).CITY_SIZE) || 1200;
    return { minX: Number.isFinite(b.minX) ? b.minX : -size / 2, maxX: Number.isFinite(b.maxX) ? b.maxX : size / 2, minZ: Number.isFinite(b.minZ) ? b.minZ : -size / 2, maxZ: Number.isFinite(b.maxZ) ? b.maxZ : size / 2 };
  };
  A.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  A.angle = v => Math.atan2(Math.sin(v), Math.cos(v));
  A.position = p => {
    p = p && (p.position || p);
    return new T.Vector3(Number(p && p.x) || 0, Number(p && p.y) || 0, Number(p && (p.z === undefined ? p[1] : p.z)) || 0);
  };
  A.grid = () => {
    const city = SF.city || {}, world = SF.world || {};
    const grid = city.streetGrid || city.grid || world.streetGrid || {};
    const coords = list => Array.isArray(list) ? list.map(v => typeof v === 'number' ? v : Number(v.coordinate === undefined ? v.position : v.coordinate)).filter(Number.isFinite).sort((a,b) => a-b) : [];
    let xs = coords(grid.x || grid.xs || city.streetX), zs = coords(grid.z || grid.zs || city.streetZ);
    if (!xs.length || !zs.length) {
      const streets = city.streets || world.streets || [];
      if (Array.isArray(streets)) streets.forEach(s => { if (s.axis === 'x' && Number.isFinite(s.z)) zs.push(s.z); if (s.axis === 'z' && Number.isFinite(s.x)) xs.push(s.x); });
    }
    const b = A.bounds();
    if (xs.length < 2) for (let x=b.minX+50;x<b.maxX;x+=80) xs.push(x);
    if (zs.length < 2) for (let z=b.minZ+50;z<b.maxZ;z+=80) zs.push(z);
    return { xs: [...new Set(xs)], zs: [...new Set(zs)] };
  };
  A.figure = (shirt = 0x3b6d81, skin = 0xc99470) => {
    const root = new T.Group(), limbs = {};
    A.part(root, [.52,.62,.28], [0,1.12,0], shirt);
    A.part(root, [.31,.34,.3], [0,1.63,0], skin, 'sphere');
    const joint = (name, pos, size, offset, color, parent = root) => {
      const g = new T.Group(); g.position.set(...pos); parent.add(g); A.part(g,size,offset,color); limbs[name]=g; return g;
    };
    [-1,1].forEach((side,i) => {
      const upper = joint('arm'+i,[side*.34,1.39,0],[.17,.33,.18],[0,-.165,0],shirt);
      const fore = joint('forearm'+i,[0,-.32,0],[.14,.29,.15],[0,-.145,0],skin,upper);
      joint('hand'+i,[0,-.29,0],[.15,.15,.16],[0,-.06,0],skin,fore);
      const thigh = joint('leg'+i,[side*.15,.84,0],[.22,.41,.23],[0,-.205,0],0x28313d);
      const shin = joint('shin'+i,[0,-.4,0],[.19,.36,.2],[0,-.18,0],0x28313d,thigh);
      joint('foot'+i,[0,-.34,.065],[.22,.13,.36],[0,-.035,.055],0x242526,shin);
    });
    root.userData.arms = [limbs.arm0,limbs.arm1]; root.userData.limbs=limbs;
    return root;
  };
  A.animateFigure = (mesh, phase, speed, time) => {
    const l=mesh.userData.limbs, swing=Math.min(1,speed/4);
    [0,1].forEach(i => {
      const wave=Math.sin(phase+i*Math.PI);
      l['arm'+i].rotation.x=-wave*.75*swing;
      l['forearm'+i].rotation.x=-.12-Math.max(0,-wave)*.45*swing;
      l['leg'+i].rotation.x=wave*.72*swing;
      l['shin'+i].rotation.x=Math.max(0,-wave)*.85*swing;
    });
    mesh.scale.y=1+Math.sin(time*2.1)*.006*(1-swing);
  };
  const keys = new Set();
  const player = SF.player = {
    mesh:null, health:100, cash:150, vehicle:null, phase:0, time:0,
    init(scene = A.scene(), spawn) {
      if (this.mesh || !scene) return this;
      this.mesh=A.figure(0xd4b07b); this.mesh.name='Sunfall player';
      const source=spawn || (SF.world || {}).playerSpawn || (SF.city || {}).playerSpawn;
      this.mesh.position.copy(A.position(source)); scene.add(this.mesh); return this;
    },
    get position() { return this.vehicle ? this.vehicle.mesh.position : this.mesh ? this.mesh.position : new T.Vector3(); },
    damage(amount) { this.health=A.clamp(this.health-Math.max(0,amount),0,100); },
    enter(car) {
      if (!car || this.vehicle || car.locked || car.driver || !this.mesh || car.mesh.position.distanceTo(this.mesh.position)>5) return false;
      if (SF.vehicles && !SF.vehicles.steal(car)) return false;
      this.vehicle=car; car.driver=this; this.mesh.visible=false; return true;
    },
    exit() {
      if (!this.vehicle) return false;
      const car=this.vehicle, exits=SF.vehicles.entryPoints(car), b=A.bounds();
      const safe=exits.find(p => p.x>b.minX+1 && p.x<b.maxX-1 && p.z>b.minZ+1 && p.z<b.maxZ-1);
      if (!safe || Math.abs(car.speed)>3) return false;
      this.mesh.position.copy(safe); this.mesh.position.y=0; this.mesh.visible=true; car.driver=null; this.vehicle=null; return true;
    },
    update(dt, input = {}) {
      if (!this.mesh) this.init(); if (!this.mesh) return;
      dt=A.clamp(Number(dt)||0,0,.05); this.time+=dt;
      if (this.vehicle) {
        if (SF.vehicles) SF.vehicles.drive(this.vehicle,dt,{ throttle:input.throttle === undefined ? Number(keys.has('KeyW'))-Number(keys.has('KeyS')) : input.throttle, steer:input.steer === undefined ? Number(keys.has('KeyA'))-Number(keys.has('KeyD')) : input.steer, brake: input.brake || keys.has('Space') });
        return;
      }
      if (!this.health) return;
      let x=Number(input.right || keys.has('KeyD'))-Number(input.left || keys.has('KeyA'));
      let z=Number(input.forward || keys.has('KeyW'))-Number(input.backward || keys.has('KeyS'));
      const length=Math.hypot(x,z), speed=length ? (input.run || keys.has('ShiftLeft') || keys.has('ShiftRight') ? 7 : 3.5) : 0;
      if (length) {
        x/=length; z/=length;
        const yaw=Number(input.cameraYaw)||0, dx=x*Math.cos(yaw)+z*Math.sin(yaw), dz=x*Math.sin(yaw)-z*Math.cos(yaw);
        this.mesh.position.x+=dx*speed*dt; this.mesh.position.z+=dz*speed*dt;
        this.mesh.rotation.y=Math.atan2(dx,dz);
      }
      const b=A.bounds(); this.mesh.position.x=A.clamp(this.mesh.position.x,b.minX+1,b.maxX-1); this.mesh.position.z=A.clamp(this.mesh.position.z,b.minZ+1,b.maxZ-1);
      this.phase+=speed*dt*2.4; A.animateFigure(this.mesh,this.phase,speed,this.time);
    }
  };
  window.addEventListener('keydown',e => {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName)) return;
    keys.add(e.code);
    if(e.code==='KeyE' && !e.repeat) { if(player.vehicle) player.exit(); else if(SF.vehicles && player.mesh) player.enter(SF.vehicles.nearest(player.position,5)); }
  });
  window.addEventListener('keyup',e => keys.delete(e.code));
  window.addEventListener('blur',() => keys.clear());
})();
