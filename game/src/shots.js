(function (SF) {
  'use strict';
  const params = new URLSearchParams(location.search), name = params.get('shot');
  const shots = { active: !!name, name };
  if (!name) { SF.shots = shots; return; }
  if (params.has('seed')) SF.random.reseed(Number(params.get('seed')));
  const player = SF.player;
  function stageCar(car, x, z, heading) {
    car.occupied = true; car.pos.set(x, 0, z); car.heading = heading; car.speed = 0; car.mesh.visible = true; car.mesh.rotation.y = heading;
  }
  if (name === 'chase') {
    player.inCar = SF.vehicles.parked[0]; stageCar(player.inCar, 0, 0, 0); player.mesh.visible = false; player.pos.copy(player.inCar.pos); SF.police.wanted = 3;
    const first = SF.police.spawn(-2.2, -6), second = SF.police.spawn(2.2, -11);
    first.heading = second.heading = 0; first.speed = second.speed = 0; first.mesh.rotation.y = second.mesh.rotation.y = 0;
    SF.render.camera.position.set(0, 5, 13); SF.render.camera.lookAt(0, 1.1, -5);
  } else if (name === 'downtown') {
    player.pos.set(4, 0, -6); SF.traffic.cars.forEach((c, i) => { c.pos.set((i - 10) * 5, 0, i % 2 ? 20 : -20); c.mesh.visible = i < 10; });
    SF.render.camera.position.set(13, 7, 20); SF.render.camera.lookAt(0, 1.5, 0);
  } else if (name === 'coast') {
    player.inCar = SF.vehicles.parked[1]; stageCar(player.inCar, -453, -46, 0); player.mesh.visible = false; player.pos.copy(player.inCar.pos);
    SF.render.camera.position.set(-453, 5.5, -61); SF.render.camera.lookAt(-453, 1.2, -35);
  } else if (name === 'end') {
    player.pos.copy(SF.missions.home).add(new THREE.Vector3(4, 0, -2)); player.mesh.visible = true; player.inCar = null; player.cash = 1240; SF.missions.current = null; SF.missions.storyDone = 5;
    SF.render.camera.position.set(112, 4.5, 61); SF.render.camera.lookAt(103, 1.3, 44);
    SF.hud.setStarted(true);
  }
  SF.hud.setStarted(true);
  let frames = 0;
  function ready() { SF.render.renderer.render(SF.render.scene, SF.render.camera); if (++frames >= 2) window.__SHOT_READY = true; else requestAnimationFrame(ready); }
  requestAnimationFrame(ready);
  SF.shots = shots;
})(window.SF);