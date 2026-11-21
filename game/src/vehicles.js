(() => {
  'use strict';
  const SF = globalThis.SF ??= {};
  const kinds = {
    sportsCoupe: { name: 'Sports coupe', width: 1.75, length: 3.7, roof: 1.15, speed: 27, turn: 1.85, color: 0x49a6af },
    sedan: { name: 'Sedan', width: 1.8, length: 4.2, roof: 1.38, speed: 22, turn: 1.55, color: 0x7a8396 },
    taxi: { name: 'Taxi', width: 1.83, length: 4.25, roof: 1.43, speed: 21, turn: 1.5, color: 0xf5b619 },
    truck: { name: 'Truck', width: 2.22, length: 5.6, roof: 2.25, speed: 16, turn: 1.05, color: 0x566d55 },
    van: { name: 'Van', width: 2.04, length: 4.85, roof: 2.04, speed: 18, turn: 1.18, color: 0xdbd3be },
    sportsCar: { name: 'Sports car', width: 1.96, length: 4.04, roof: 1.02, speed: 32, turn: 2.02, color: 0xd34255 }
  };
  const instances = [];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function spawn(kind, position, options = {}) {
    const T = SF.THREE ?? globalThis.THREE, scene = SF.render?.scene;
    if (!T || !scene) return null;
    const spec = kinds[kind] ?? kinds.sedan;
    const { width, length, roof } = spec;
    const mesh = new T.Group();
    const origin = SF.player.positionOf(position);
    mesh.position.set(origin?.x ?? 0, origin?.y ?? 0, origin?.z ?? 0);
    mesh.rotation.y = options.heading ?? 0;
    const material = (color, emission = 0) =>
      new T.MeshStandardMaterial({ color, emissive: emission, emissiveIntensity: 0 });
    const paint = material(options.color ?? spec.color);
    const glass = material(0x263946), rubber = material(0x1a1b20), steel = material(0x737981);
    const front = material(0xffedc8, 0xffe5ad), rear = material(0x9f1728, 0xff1530);
    function box(parent, mat, w, h, d, x, y, z) {
      const part = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
      part.position.set(x, y, z);
      part.castShadow = true;
      parent.add(part);
      return part;
    }
    box(mesh, paint, width, .47, length, 0, .56, 0);
    box(mesh, steel, width * .97, .13, length * 1.015, 0, .38, 0);
    const cabLength = length * (kind === 'truck' ? .31 : kind === 'van' ? .72 : .49);
    const cabZ = kind === 'truck' ? length * .24 : -.07;
    box(mesh, glass, width * .85, roof - .76, cabLength, 0, (roof + .76) / 2, cabZ);
    box(mesh, paint, width * .89, .09, cabLength * 1.02, 0, roof, cabZ);
    if (kind === 'truck') box(mesh, paint, width * .94, 1.26, length * .51, 0, 1.33, -length * .21);
    if (kind === 'van') box(mesh, paint, width * .87, .94, length * .36, 0, 1.35, -length * .23);
    const wheels = [], lights = [];
    for (const side of [-1, 1]) {
      box(mesh, front, .29, .12, .06, side * width * .34, .63, length / 2);
      box(mesh, rear, .28, .12, .06, side * width * .34, .63, -length / 2);
      if (T.SpotLight && options.headlights) {
        const lamp = new T.SpotLight(0xffe0a6, 0, 18, .38, .55, 1.5);
        lamp.position.set(side * width * .34, .63, length / 2 + .15);
        lamp.target.position.set(side * width * .34, .05, length / 2 + 13);
        mesh.add(lamp, lamp.target);
        lights.push(lamp);
      }
      for (const axle of [-1, 1]) {
        const pivot = new T.Group();
        pivot.position.set(side * width * .48, .31, axle * length * .31);
        mesh.add(pivot);
        const roll = new T.Group();
        pivot.add(roll);
        const tire = new T.Mesh(new T.CylinderGeometry(.31, .31, .23, 12), rubber);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        roll.add(tire);
        box(roll, steel, .245, .08, .42, 0, 0, 0);
        wheels.push({ pivot, roll, steer: axle === 1 });
      }
    }
    if (kind === 'taxi') {
      const sign = material(0xffe8a6, 0xffb83a);
      sign.emissiveIntensity = .45;
      box(mesh, sign, .66, .21, .31, 0, roof + .13, cabZ);
      if (globalThis.document) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffe7a4';
        ctx.fillRect(0, 0, 256, 80);
        ctx.fillStyle = '#251a12';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TAXI', 128, 63);
        const texture = new T.CanvasTexture(canvas);
        if (T.SRGBColorSpace) texture.colorSpace = T.SRGBColorSpace;
        const label = new T.MeshBasicMaterial({ map: texture });
        for (const side of [-1, 1]) {
          const face = new T.Mesh(new T.PlaneGeometry(.64, .2), label);
          face.position.set(0, roof + .13, cabZ + side * .157);
          face.rotation.y = side === 1 ? 0 : Math.PI;
          mesh.add(face);
        }
      }
    }
    const car = { kind, spec, mesh, wheels, front, rear, lights, speed: 0, steer: 0,
      driver: options.driver ?? null, locked: Boolean(options.locked), brake: false };
    mesh.userData.vehicle = car;
    scene.add(mesh);
    instances.push(car);
    return car;
  }

  function doorPoints(car) {
    car.mesh.updateMatrixWorld(true);
    return [-1, 1].map(side => car.mesh.localToWorld(car.mesh.position.clone()
      .set(side * (car.spec.width / 2 + .51), 0, .35)));
  }

  function drive(car, dt, input) {
    const throttle = clamp(input.throttle ?? input.moveZ ?? 0, -1, 1);
    car.steer = clamp(input.steer ?? input.moveX ?? 0, -1, 1);
    car.brake = Boolean(input.brake) || throttle * car.speed < 0;
    car.speed += throttle * 13 * dt;
    car.speed *= Math.exp(-dt * (car.brake ? 4 : throttle ? .34 : .85));
    car.speed = clamp(car.speed, -7, car.spec.speed);
    const yaw = car.mesh.rotation.y += car.steer * car.spec.turn * dt * clamp(car.speed / 4, -1, 1);
    const position = car.mesh.position;
    const x = position.x, z = position.z;
    position.x += Math.sin(yaw) * car.speed * dt;
    position.z += Math.cos(yaw) * car.speed * dt;
    const hit = instances.some(other => other !== car && other.mesh.position.distanceToSquared(position) <
      ((car.spec.width + other.spec.width) * .46) ** 2) || SF.city?.buildings?.some(b=>position.x>b.minX-1 && position.x<b.maxX+1 && position.z>b.minZ-1 && position.z<b.maxZ+1);
    if (hit) {
      position.x = x;
      position.z = z;
      car.speed *= -.18;
      car.brake = true;
    }
    SF.player.constrain(position, car.spec.length / 2);
  }

  SF.vehicles = {
    kinds, instances, spawn, drive, doorPoints,
    remove(car) {
      const index = instances.indexOf(car);
      if (index < 0) return;
      instances.splice(index, 1);
      car.mesh.removeFromParent();
      const materials = new Set();
      car.mesh.traverse(node => {
        node.geometry?.dispose();
        if (node.material) materials.add(node.material);
      });
      for (const mat of materials) {
        mat.map?.dispose();
        mat.dispose();
      }
    },
    nearestDoor(position) {
      if (!position) return null;
      let nearest = null, distance = 1.65;
      for (const car of instances) {
        if (car.locked || Math.abs(car.speed) > 5) continue;
        const gap = Math.min(...doorPoints(car).map(door => door.distanceTo(position)));
        if (gap < distance) {
          nearest = car;
          distance = gap;
        }
      }
      return nearest;
    },
    take(car, player) {
      if (!car || car.locked || car.driver === player || !instances.includes(car) ||
          Math.abs(car.speed) > 5 || !doorPoints(car).some(door => door.distanceTo(player.position) < 1.65)) return false;
      car.driver = player;
      SF.police?.report('theft', player.position);
      return true;
    },
    update(dt) {
      const dark = SF.world?.isDusk ?? SF.world?.isNight ?? true;
      for (const car of instances) {
        if (!car.driver) {
          car.speed = 0;
          car.steer = 0;
          car.brake = false;
        }
        const lit = Boolean(dark && car.driver);
        car.front.emissiveIntensity = lit ? 2 : .04;
        car.rear.emissiveIntensity = car.brake ? 2.8 : lit ? .54 : .08;
        const near = SF.player.position?.distanceToSquared(car.mesh.position) < 28 ** 2;
        for (const light of car.lights) light.intensity = lit && (car.driver === SF.player || car === SF.traffic?.beamCar) && near ? 16 : 0;
        for (const { pivot, roll, steer } of car.wheels) {
          pivot.rotation.y = steer ? car.steer * .5 : 0;
          roll.rotation.x = (roll.rotation.x + car.speed * dt / .31) % (2 * Math.PI);
        }
      }
    }
  };
})();
