(() => {
  'use strict';
  const SF = globalThis.SF ??= {};
  const patrols = [], roadblocks = [], officers = [];
  const costs = { theft: 20, punch: 17, shot: 23, officer: 35 };
  let helicopter, sightTimer = 0, visible = false, dispatch = 0, arrest = 0, clock = 0;
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  function clearLine(from, to) {
    const check = SF.world?.hasLineOfSight ?? SF.city?.hasLineOfSight;
    if (typeof check === 'function') return check.call(SF.world?.hasLineOfSight ? SF.world : SF.city, from, to);
    const obstacles = SF.world?.buildings ?? SF.city?.buildings;
    if (!Array.isArray(obstacles)) return true;
    return !obstacles.some(building => {
      const b = building.bounds ?? building;
      const ranges = [[b.minX ?? b.min?.x, b.maxX ?? b.max?.x], [b.minZ ?? b.min?.z, b.maxZ ?? b.max?.z]];
      if (!ranges.flat().every(Number.isFinite)) return false;
      let near = 0, far = 1;
      for (let i = 0; i < 2; i++) {
        const axis = i === 0 ? 'x' : 'z';
        const [low, high] = ranges[i], delta = to[axis] - from[axis];
        if (Math.abs(delta) < .0001) {
          if (from[axis] <= low || from[axis] >= high) return false;
          continue;
        }
        const a = (low - from[axis]) / delta, b = (high - from[axis]) / delta;
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
        if (near >= far) return false;
      }
      return true;
    });
  }

  function sees(mesh, point, range, omnidirectional = false) {
    const p = mesh.position, distance = gap(p, point);
    if (distance > range) return false;
    const yaw = mesh.rotation.y;
    const facing = ((point.x - p.x) * Math.sin(yaw) + (point.z - p.z) * Math.cos(yaw));
    return (omnidirectional || distance < 4 || facing > distance * .32) && clearLine(p, point);
  }

  function nearbyRoad(point, min, max) {
    const grid = SF.traffic.grid ?? SF.traffic.axes();
    const options = [];
    const points=[];
    for(const x of grid.x) for(let z=grid.z[0];z<=grid.z.at(-1);z+=16) points.push({x,z});
    for(const z of grid.z) for(let x=grid.x[0];x<=grid.x.at(-1);x+=16) points.push({x,z});
    for (const {x,z} of points) {
      const p = { x, z };
      const distance = gap(point, p);
      if (distance >= min && distance <= max && !SF.vehicles.instances.some(car => gap(p, car.mesh.position) < 5)) options.push(p);
    }
    return options.length ? SF.traffic.pick(options) : null;
  }

  function box(parent, w, h, d, x, y, z, color) {
    const T = SF.THREE ?? globalThis.THREE;
    const item = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .1 }));
    item.position.set(x, y, z);
    parent.add(item);
    return item;
  }

  function dispatchCar(point, block) {
    const unit = { lights: [], block };
    const position = nearbyRoad(point, block ? 12 : 21, block ? 36 : 52);
    if (!position) return;
    unit.origin = position;
    unit.car = SF.vehicles.spawn(block ? 'van' : 'sedan', position, {
      driver: unit, locked: true, color: 0x233451, heading: block ? Math.PI / 2 : 0
    });
    if (!unit.car) return;
    for (const [x, color] of [[-.22, 0xfd263d], [.22, 0x3875ff]]) {
      unit.lights.push(box(unit.car.mesh, .4, .11, .22, x, unit.car.spec.roof + .11, 0, color));
    }
    (block ? roadblocks : patrols).push(unit);
  }

  function spawnOfficer(point) {
    const origin = nearbyRoad(point, 9, 36);
    if (!origin) return;
    const mesh = SF.player.figure({ shirt: 0x263953, pants: 0x222d3d });
    mesh.position.set(origin.x, 0, origin.z);
    SF.render.scene.add(mesh);
    officers.push({ mesh, health: 100, down: 0 });
  }

  function spawnHelicopter(point) {
    const T = SF.THREE ?? globalThis.THREE;
    const mesh = new T.Group();
    box(mesh, 1.8, 1.55, 4, 0, 0, 0, 0x273a4c);
    box(mesh, 1.55, .95, .48, 0, .18, 1.95, 0x598ba5);
    box(mesh, .44, .36, 3.8, 0, .1, -3.15, 0x273a4c);
    box(mesh, .16, 1.1, .62, 0, .55, -4.55, 0x273a4c);
    const rotor = new T.Group();
    box(rotor, 7.8, .065, .25, 0, 1.05, 0, 0x1b2430);
    box(rotor, .25, .065, 7.8, 0, 1.05, 0, 0x1b2430);
    mesh.add(rotor);
    const beam = new T.SpotLight(0xffedc9, 170, 43, .34, .6, 1.5);
    beam.position.set(0, -.85, 0);
    mesh.add(beam);
    SF.render.scene.add(mesh, beam.target);
    mesh.position.set(point.x + 16, 23, point.z);
    helicopter = { mesh, rotor, beam, phase: 0 };
  }

  function dropHelicopter() {
    if (!helicopter) return;
    helicopter.beam.target.removeFromParent();
    SF.peds.disposeFigure(helicopter.mesh);
    helicopter = null;
  }

  function updateHelicopter(dt, point, search) {
    helicopter.phase += dt * .65;
    const { mesh, phase, rotor, beam } = helicopter;
    const angle = phase % (2 * Math.PI);
    mesh.position.x += (point.x + Math.cos(angle) * 17 - mesh.position.x) * Math.min(1, dt);
    mesh.position.z += (point.z + Math.sin(angle) * 17 - mesh.position.z) * Math.min(1, dt);
    mesh.rotation.y = -angle;
    rotor.rotation.y += dt * 29;
    beam.target.position.set(search.x, 0, search.z);
  }

  function patrol(dt, unit, target, stars) {
    const car = unit.car, p = car.mesh.position;
    if (unit.block) {
      car.brake = true;
      return;
    }
    const parked = stars === 0 && gap(p, unit.origin) < 2;
    const desired = Math.atan2(target.x - p.x, target.z - p.z);
    const diff = desired - car.mesh.rotation.y;
    const turn = Math.atan2(Math.sin(diff), Math.cos(diff));
    const distance = gap(p, target);
    if (!parked && distance > 1.75 && Math.abs(turn) > .95) {
      car.mesh.rotation.y += Math.sign(turn) * dt * 1.35;
      car.steer = Math.sign(turn);
      car.speed *= Math.exp(-5 * dt);
      car.brake = true;
      return;
    }
    SF.vehicles.drive(car, dt, {
      throttle: parked || distance < 1.75 ? 0 : stars ? Math.min(1, distance / 12) : .35,
      steer: parked ? 0 : turn * 1.6,
      brake: parked || distance < 1.75 || Math.abs(turn) > 1
    });
  }

  const police = {
    heat: 0, patrols, roadblocks, officers, clearLine,
    search: { x: 0, z: 0, radius: 0, active: false },
    lastOutcome: null,
    get stars() { return Math.ceil(this.heat / 20); },
    report(kind, point, victim = null) {
      if (!point || !costs[kind]) return false;
      const seen = [...patrols, ...roadblocks].some(unit => sees(unit.car.mesh, point, 31)) ||
        officers.some(officer => officer.health > 0 && sees(officer.mesh, point, 28)) ||
        (kind !== 'theft' && SF.peds?.instances.some(ped => ped !== victim && ped.health > 0 && sees(ped.mesh, point, 19)));
      if (!seen) return false;
      this.heat = Math.min(100, this.heat + costs[kind]);
      Object.assign(this.search, { x: point.x, z: point.z });
      sightTimer = 0;
      return true;
    },
    drawMinimap(ctx, project, pixelsPerUnit) {
      if (!this.search.active) return;
      const point = project(this.search.x, this.search.z);
      ctx.save();
      ctx.strokeStyle = '#ffb15a';
      ctx.fillStyle = 'rgba(255, 153, 67, .15)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(point.x, point.y, this.search.radius * pixelsPerUnit, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
    updateMinimap() {
      if (!globalThis.document) return;
      if (SF.hud) return; // The main HUD draws search, patrols and wanted stars together.
      let canvas = document.querySelector('canvas[data-sunfall-search]');
      if (!canvas && !this.stars) return;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.dataset.sunfallSearch = '';
        canvas.width = canvas.height = 144;
        canvas.setAttribute('aria-label', 'Police search minimap');
        Object.assign(canvas.style, {
          position: 'fixed', right: '1rem', bottom: '1rem', zIndex: '20',
          pointerEvents: 'none', background: '#141a24df', border: '1px solid #ffffff55'
        });
        document.body.append(canvas);
      }
      canvas.hidden = !this.stars;
      if (canvas.hidden) return;
      canvas.setAttribute('aria-label', `Police minimap, ${this.stars} of 5 wanted stars`);
      const ctx = canvas.getContext('2d'), center = canvas.width / 2;
      const point = SF.player.position, scale = 1.25;
      const project = (x, z) => ({ x: center + (x - point.x) * scale, y: center + (z - point.z) * scale });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const grid = SF.traffic.grid ?? SF.traffic.axes();
      ctx.strokeStyle = '#546074';
      ctx.beginPath();
      for (const x of grid.x) {
        const screen = project(x, point.z);
        ctx.moveTo(screen.x, 0);
        ctx.lineTo(screen.x, canvas.height);
      }
      for (const z of grid.z) {
        const screen = project(point.x, z);
        ctx.moveTo(0, screen.y);
        ctx.lineTo(canvas.width, screen.y);
      }
      ctx.stroke();
      this.drawMinimap(ctx, project, scale);
      ctx.fillStyle = '#fff';
      ctx.fillRect(center - 2, center - 2, 4, 4);
      ctx.fillStyle = '#141a24';
      ctx.fillRect(0, 0, canvas.width, 22);
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < this.stars ? '#ffb15a' : '#a1a8b6';
        ctx.fillText(i < this.stars ? '★' : '☆', 28 + i * 22, 17);
      }
    },
    finish(outcome) {
      const penalty = outcome === 'busted' ? 125 : 175;
      this.lastOutcome = outcome;
      this.heat = 0;
      sightTimer = arrest = 0;
      this.search.active = false;
      for (const collection of [patrols, roadblocks]) {
        for (const unit of collection.splice(0)) SF.vehicles.remove(unit.car);
      }
      for (const officer of officers.splice(0)) SF.peds.disposeFigure(officer.mesh);
      dropHelicopter();
      SF.player.respawn(penalty);
      this.updateMinimap();
    },
    update(dt) {
      const p = SF.player.position;
      if (!p || !SF.traffic || !SF.vehicles || !SF.peds) return;
      if (SF.player.health <= 0) return this.finish('wasted');
      clock += dt;
      const stars = this.stars;
      if (stars === 5 && !helicopter) spawnHelicopter(this.search);
      if (stars < 5) dropHelicopter();
      visible = stars > 0 && (
        [...patrols, ...roadblocks].some(unit => sees(unit.car.mesh, p, 24)) ||
        officers.some(officer => officer.health > 0 && sees(officer.mesh, p, 24)) ||
        (helicopter && gap(helicopter.mesh.position, p) < 17 && clearLine(helicopter.mesh.position, p))
      );
      if (visible) {
        sightTimer = 0;
        Object.assign(this.search, { x: p.x, z: p.z });
      } else {
        sightTimer += dt;
        if (sightTimer > 6) this.heat = Math.max(0, this.heat - dt * 5);
      }
      this.search.active = this.stars > 0 && !visible;
      this.search.radius = this.stars ? 16 + this.stars * 5 : 0;
      if (helicopter) updateHelicopter(dt, this.search, this.search);
      const patrolLimit = [1, 1, 2, 3, 3, 4][stars];
      const blockLimit = stars >= 3 ? (stars >= 5 ? 2 : 1) : 0;
      const officerLimit = stars >= 4 ? stars - 2 : 0;
      for (const [units, limit] of [[patrols, patrolLimit], [roadblocks, blockLimit]]) {
        for (let i = units.length - 1; i >= 0; i--) {
          if (i >= limit || gap(units[i].car.mesh.position, p) > 82) {
            SF.vehicles.remove(units[i].car);
            units.splice(i, 1);
          }
        }
      }
      dispatch -= dt;
      if (dispatch <= 0) {
        dispatch = 1.9;
        if (patrols.length < patrolLimit) dispatchCar(stars ? this.search : p, false);
        if (roadblocks.length < blockLimit) dispatchCar(this.search, true);
        if (officers.filter(officer => officer.health > 0).length < officerLimit) spawnOfficer(this.search);
      }
      for (const unit of [...patrols, ...roadblocks]) {
        const flash = Math.floor(clock / .135) % 2;
        unit.lights.forEach((light, i) => { light.material.emissiveIntensity = stars && flash === i ? 4 : .1; });
        patrol(dt, unit, stars ? this.search : unit.origin, stars);
      }
      for (let i = officers.length - 1; i >= 0; i--) {
        const officer = officers[i], pos = officer.mesh.position;
        if (!officerLimit || officer.down > 4 || gap(pos, p) > 68) {
          SF.peds.disposeFigure(officer.mesh);
          officers.splice(i, 1);
          continue;
        }
        if (officer.health <= 0) {
          officer.down += dt;
          officer.mesh.rotation.z = Math.min(Math.PI / 2, officer.down * 5);
          continue;
        }
        const target = visible ? p : this.search;
        const distance = gap(pos, target);
        const yaw = Math.atan2(target.x - pos.x, target.z - pos.z);
        const speed = distance > 1.5 ? 4.6 : 0;
        officer.mesh.rotation.y = yaw;
        pos.x += Math.sin(yaw) * speed * dt;
        pos.z += Math.cos(yaw) * speed * dt;
        SF.player.constrain(pos);
        officer.mesh.userData.animate(dt, speed);
        if (visible && gap(pos, p) < 2.1 && clearLine(pos, p)) SF.player.health -= 18 * dt;
      }
      const surrounded = visible && SF.player.speed < 2 && (
        patrols.some(unit => gap(unit.car.mesh.position, p) < 3.5) ||
        officers.some(officer => officer.health > 0 && gap(officer.mesh.position, p) < 2.5)
      );
      arrest = surrounded ? arrest + dt : Math.max(0, arrest - dt * 2);
      if (arrest > 2.3) return this.finish('busted');
      this.updateMinimap();
    }
  };
  SF.police = police;
})();
