(() => {
  'use strict';
  const SF = globalThis.SF ??= {};
  const three = () => SF.THREE ?? globalThis.THREE;

  function figure({ shirt = 0x307989, pants = 0x273344, skin = 0xb97955 } = {}) {
    const T = three();
    const mesh = new T.Group();
    const body = new T.Group();
    mesh.add(body);
    const materials = [shirt, pants, skin, 0x202029].map(color => new T.MeshStandardMaterial({ color }));
    function part(parent, width, height, depth, x, y, z, material) {
      const piece = new T.Mesh(new T.BoxGeometry(width, height, depth), materials[material]);
      piece.position.set(x, y, z);
      piece.castShadow = true;
      parent.add(piece);
      return piece;
    }
    function joint(parent, x, y, z) {
      const group = new T.Group();
      group.position.set(x, y, z);
      parent.add(group);
      return group;
    }
    part(body, .42, .54, .25, 0, 1.16, 0, 0);
    part(body, .13, .12, .13, 0, 1.46, 0, 2);
    part(body, .25, .28, .24, 0, 1.63, 0, 2);
    part(body, .26, .08, .25, 0, 1.78, -.015, 3);
    const arms = [], elbows = [], legs = [], knees = [];
    for (const side of [-1, 1]) {
      const arm = joint(body, side * .28, 1.39, 0);
      part(arm, .14, .28, .15, 0, -.125, 0, 0);
      const elbow = joint(arm, 0, -.27, 0);
      part(elbow, .115, .23, .12, 0, -.105, 0, 2);
      part(elbow, .115, .12, .125, 0, -.26, 0, 2);
      const leg = joint(body, side * .113, .93, 0);
      part(leg, .19, .4, .2, 0, -.185, 0, 1);
      const knee = joint(leg, 0, -.39, 0);
      part(knee, .155, .39, .16, 0, -.175, 0, 1);
      part(knee, .17, .13, .28, 0, -.475, .06, 3);
      arms.push(arm);
      elbows.push(elbow);
      legs.push(leg);
      knees.push(knee);
    }
    mesh.userData.arms = arms;
    let phase = 0, clock = 0, stride = 0;
    mesh.userData.animate = (dt, speed, pose, action = 0) => {
      clock += dt;
      phase += dt * (speed > 4 ? 13 : 8);
      stride += (Math.min(speed / 5, 1) - stride) * (1 - Math.exp(-dt * 12));
      body.position.y = .025 * Math.cos(phase * 2) * stride + .012 * Math.sin(clock * 2);
      body.scale.y = 1 + .009 * Math.sin(clock * 2);
      for (let i = 0; i < 2; i++) {
        const wave = Math.sin(phase + i * Math.PI);
        arms[i].rotation.x = -wave * stride * .86;
        elbows[i].rotation.x = -.12 - stride * .45;
        legs[i].rotation.x = wave * stride * .92;
        knees[i].rotation.x = Math.max(0, -wave) * stride * .95;
      }
      if (pose === 'aim') {
        arms[1].rotation.x = -1.45 + action * .22;
        elbows[1].rotation.x = -.14;
      } else if (pose === 'punch') {
        arms[1].rotation.x = -1.65 * action;
        elbows[1].rotation.x = -.7 * (1 - action);
      }
    };
    return mesh;
  }

  function positionOf(value) {
    const source = value?.position ?? value;
    if (Array.isArray(source)) {
      return { x: source[0], y: source.length > 2 ? source[1] : 0, z: source.at(-1) };
    }
    return source;
  }

  function constrain(position, margin = .3) {
    const bounds = SF.city?.bounds ?? SF.world?.bounds ?? SF.CONFIG?.bounds;
    const limit = SF.CONFIG?.tuning?.cityHalfSize ?? 100;
    const minX = bounds?.minX ?? bounds?.min?.x ?? -limit;
    const maxX = bounds?.maxX ?? bounds?.max?.x ?? limit;
    const minZ = bounds?.minZ ?? bounds?.min?.z ?? -limit;
    const maxZ = bounds?.maxZ ?? bounds?.max?.z ?? limit;
    position.x = Math.max(minX + margin, Math.min(maxX - margin, position.x));
    position.z = Math.max(minZ + margin, Math.min(maxZ - margin, position.z));
    return position;
  }

  const player = {
    mesh: null,
    car: null,
    health: 100,
    cash: 250,
    heading: 0,
    speed: 0,
    figure, positionOf, constrain,
    get position() { return this.car?.mesh.position ?? this.mesh?.position; },
    init() {
      if (this.mesh) return this.mesh;
      const scene = SF.render?.scene;
      if (!scene || !three()) return null;
      this.mesh = figure();
      scene.add(this.mesh);
      this.respawn();
      return this.mesh;
    },
    enter(car = SF.vehicles?.nearestDoor(this.position)) {
      if (!this.mesh || this.car || !SF.vehicles?.take(car, this)) return false;
      this.car = car;
      this.heading = car.mesh.rotation.y;
      this.mesh.visible = false;
      return true;
    },
    exit(force = false) {
      const car = this.car;
      if (!car || (!force && Math.abs(car.speed) > 5)) return false;
      const exit = SF.vehicles.doorPoints(car)[0];
      this.mesh.position.copy(constrain(exit));
      this.mesh.visible = true;
      this.heading = car.mesh.rotation.y;
      car.driver = null;
      this.car = null;
      return true;
    },
    respawn(penalty = 0) {
      if (!this.mesh) return;
      this.exit(true);
      const spawn = positionOf(SF.world?.safehouse ?? SF.city?.safehouse ??
        SF.world?.spawnPoints?.[0] ?? SF.city?.spawnPoints?.[0]);
      this.mesh.position.set(spawn?.x ?? 0, spawn?.y ?? 0, spawn?.z ?? 0);
      constrain(this.mesh.position);
      this.health = 100;
      this.speed = 0;
      this.cash = Math.max(0, this.cash - penalty);
      SF.weapons?.reset();
    },
    update(dt, input = {}) {
      if (!this.init() || !Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, .05);
      if (input.interact && !this.interactHeld) {
        if (this.car) this.exit();
        else this.enter();
      }
      this.interactHeld = Boolean(input.interact);
      if (this.car) {
        SF.vehicles.drive(this.car, dt, input);
        this.heading = this.car.mesh.rotation.y;
        this.speed = Math.abs(this.car.speed);
      } else {
        const x = input.moveX || 0, z = input.moveZ || 0;
        const magnitude = Math.hypot(x, z);
        this.speed = Math.min(magnitude, 1) * (input.run ? 7 : 3.2);
        if (magnitude) {
          this.heading = Math.atan2(x, z);
          const before = this.mesh.position.clone();
          this.mesh.position.x += x / magnitude * this.speed * dt;
          this.mesh.position.z += z / magnitude * this.speed * dt;
          constrain(this.mesh.position);
          if (SF.city?.buildings?.some(b=>this.mesh.position.x>b.minX-.3 && this.mesh.position.x<b.maxX+.3 && this.mesh.position.z>b.minZ-.3 && this.mesh.position.z<b.maxZ+.3)) this.mesh.position.copy(before);
        }
        SF.weapons?.update(dt, input);
        this.mesh.rotation.y = this.heading;
        this.mesh.userData.animate(dt, this.speed, SF.weapons?.pose, SF.weapons?.action);
      }
      if (this.car) SF.weapons?.update(dt, {});
      SF.traffic?.update(dt);
      SF.peds?.update(dt);
      SF.police?.update(dt);
      SF.vehicles?.update(dt);
    }
  };
  SF.player = player;
})();
