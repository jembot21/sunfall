(function (SF) {
  'use strict';
  SF.save.load();
  const clock = new THREE.Clock(); let started = false;
  const shot = new URLSearchParams(location.search).has('shot');
  if (shot) { started = true; SF.input.started = true; }
  else {
    const begin = () => { if (started) return; started = true; SF.hud.begin(); window.removeEventListener('keydown', begin); };
    window.addEventListener('keydown', begin, { once: true });
  }
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(1 / 20, clock.getDelta());
    if (started && !SF.input.paused) {
      SF.player.update(dt); SF.vehicles.update(dt); SF.traffic.update(dt); SF.peds.update(dt); SF.police.update(dt); SF.missions.update(dt); SF.audio.update(dt);
    }
    SF.hud.update(dt);
    SF.render.update(dt, SF.player.pos);
    if (typeof SF.input.endFrame === 'function') SF.input.endFrame();
    else if (typeof SF.input.consume === 'function') SF.input.consume();
  }
  window.__SF = SF; requestAnimationFrame(frame);
})(window.SF);
