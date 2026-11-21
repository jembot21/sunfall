(function () {
  'use strict';
  const SF = window.SF = window.SF || {};
  let booted = false, last = 0, renderer, scene, camera, shotApplied = false, controls;
  const shotName = new URLSearchParams(window.location.search).get('shot');
  function systemInit(name) {
    const s = SF[name];
    if (typeof s?.init === 'function') return s.init.length ? s.init(scene) : s.init();
    if (typeof s?.build === 'function') return s.build(scene);
  }
  function mode() { return SF.state?.mode || 'menu'; }
  function start(continuing) {
    SF.audio?.unlock();
    if (SF.player.vehicle) SF.player.exit?.();
    SF.phone?.clear();
    if (!continuing) {
      SF.save?.clear(); SF.missions?.reset();
      SF.player.cash = 200; SF.player.health = 100;
      SF.player.reset?.(); SF.police?.reset?.();
      SF.police.wanted = 0;
      SF.player.busted = false;
      for (const slot of SF.weapons?.slots || []) slot.unlocked = slot.id === 'fists';
      SF.weapons?.equip('fists');
      const spawn = SF.world.spawn;
      if (spawn && SF.player.mesh) { SF.player.mesh.position.set(spawn.x, spawn.y, spawn.z); SF.player.mesh.rotation.y = spawn.heading || 0; }
    } else SF.save?.load();
    SF.runtime.setMode('play');
    if (controls) { controls.hidden = true; controls.style.display = 'none'; }
    document.getElementById('sf-menu')?.setAttribute('hidden', '');
    SF.input?.lock();
  }
  function buildMenu() {
    const old = document.getElementById('start-menu') || document.getElementById('menu');
    // Bind existing semantic buttons when a HUD/template already supplies them.
    const bind = (selectors, action) => {
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) { el.addEventListener('click', action); return el; }
      }
      return null;
    };
    const newButton = bind(['#new-game', '#newGame', '[data-action="new-game"]'], () => start(false));
    if (newButton) {
      const cont = bind(['#continue', '#continue-game', '#continueGame', '[data-action="continue"]'], () => start(true));
      if (cont) cont.disabled = !SF.save?.saved;
      bind(['#how-to-play', '#howToPlay', '[data-action="how-to-play"]'], () => showHelp());
      controls = old;
      return;
    }
    controls = document.createElement('section'); controls.id = 'sf-menu';
    Object.assign(controls.style, { position: 'fixed', inset: '0', zIndex: '30', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: '7vw', color: '#fff0d0', background: 'linear-gradient(90deg,rgba(13,24,32,.85),transparent)', fontFamily: 'system-ui,sans-serif' });
    const eyebrow = document.createElement('p'); eyebrow.textContent = 'SOLANO BAY · A SUNLIT CRIME STORY'; controls.appendChild(eyebrow);
    const title = document.createElement('h1'); title.textContent = 'SUNFALL'; title.style.cssText = 'font-size:clamp(56px,10vw,140px);letter-spacing:-.06em;margin:0 0 24px;line-height:1'; controls.appendChild(title);
    for (const [label, action, disabled] of [ ['New Game', () => start(false), false], ['Continue', () => start(true), !SF.save?.saved], ['How to Play', showHelp, false] ]) {
      const b = document.createElement('button'); b.textContent = label; b.disabled = disabled;
      b.style.cssText = 'font:600 18px system-ui;margin:5px 0;padding:12px 28px;background:#ffcf8b;border:0;border-radius:3px;color:#182e36;cursor:pointer';
      b.addEventListener('click', action); controls.appendChild(b);
    }
    document.body.appendChild(controls);
  }
  function showHelp() {
    let panel = document.getElementById('sf-help');
    if (!panel) {
      panel = document.createElement('section'); panel.id = 'sf-help';
      panel.style.cssText = 'position:fixed;inset:15%;z-index:60;background:#142630;color:#fff0d0;padding:30px;font:18px/1.6 system-ui;overflow:auto';
      const text = document.createElement('p'); text.textContent = 'WASD move / drive · Mouse look · Shift sprint · Space brake · E enter / exit a vehicle · Mouse click fire · P or Escape pause · R SOLANO FM in a car · M start the next story job · G take a nearby side job. Follow the gold marker to Marco Reyes in Palma Strand. Reach each marked objective to progress. Lose wanted stars before returning to the crew. Story payouts save automatically.';
      panel.appendChild(text);
      const close = document.createElement('button'); close.textContent = 'Back'; close.addEventListener('click', () => { panel.hidden = true; }); panel.appendChild(close); document.body.appendChild(panel);
    }
    panel.hidden = false;
  }
  function cameraFrame(dt, now) {
    if (!camera) return;
    const p = SF.player?.vehicle?.mesh?.position || SF.player?.mesh?.position || SF.player?.position;
    if (mode() === 'menu' || !p) {
      const a = now * 0.000055;
      camera.position.set(Math.sin(a) * 220, 110, Math.cos(a) * 220); camera.lookAt(0, 0, 0); return;
    }
    if (SF.shots?.active || shotApplied) return;
    const yaw = SF.input?.yaw || 0, pitch = SF.input?.pitch || 0;
    const radius = SF.player?.vehicle || SF.player?.inVehicle ? 10 : 6;
    const desired = new THREE.Vector3(p.x + Math.sin(yaw) * radius, p.y + 3.3 - Math.sin(pitch) * 4, p.z + Math.cos(yaw) * radius);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 8)); camera.lookAt(p.x, p.y + 1.5, p.z);
  }
  function frame(now) {
    const dt = Math.min((now - (last || now)) / 1000, 0.1); last = now;
    SF.runtime.update(dt);
    if (shotName && !shotApplied && SF.shots?.apply) { SF.shots.apply(shotName); shotApplied = true; }
    cameraFrame(dt, now);
    renderer?.render(scene, camera);
    if (controls && mode() !== 'menu') { controls.hidden = true; controls.style.display = 'none'; }
    if ((mode() === 'pause' || mode() === 'wasted' || mode() === 'busted') && !document.getElementById('sf-resume')) {
      const b = document.createElement('button'); b.id = 'sf-resume'; b.textContent = mode() === 'pause' ? 'Resume' : 'Return to safehouse';
      b.style.cssText = 'position:fixed;left:40%;top:45%;z-index:80;padding:20px;font:20px system-ui';
      b.addEventListener('click', () => { if (mode() !== 'pause') { SF.player.health = 100; SF.police?.reset?.(); SF.player.busted = false; SF.save?.load(); } SF.runtime.setMode('play'); SF.input?.lock(); b.remove(); }); document.body.appendChild(b);
    }
    if (mode() === 'play') document.getElementById('sf-resume')?.remove();
    window.requestAnimationFrame(frame);
  }
  SF.main = {
    start,
    boot() {
      if (booted) return; booted = true;
      SF.render?.init?.();
      scene = SF.render?.scene || SF.scene || new THREE.Scene();
      SF.scene = scene;
      if (!SF.city?.root) {
        if (typeof SF.world?.build === 'function') SF.world.build(scene);
        else SF.world?.init?.(scene);
      }
      renderer = SF.render?.renderer || SF.world?.renderer || SF.renderer;
      camera = SF.render?.camera || SF.world?.camera || SF.camera;
      if (!camera) camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1800);
      if (!renderer) { renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(window.innerWidth, window.innerHeight); document.body.appendChild(renderer.domElement); }
      SF.scene = scene; SF.renderer = renderer; SF.camera = camera;
      if (!SF.city?.root) systemInit('city');
      for (const key of ['vehicles', 'player', 'traffic', 'peds', 'police', 'weapons', 'missions', 'hud', 'ui']) systemInit(key);
      const spawn = SF.world.spawn;
      if (spawn && SF.player.mesh) SF.player.mesh.position.set(spawn.x, spawn.y, spawn.z);
      if (SF.weapons) {
        const previousShot = SF.weapons.onShot;
        SF.weapons.onShot = event => { if (typeof previousShot === 'function') previousShot(event); SF.audio?.gunshot(); };
      }
      buildMenu();
      window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
      window.addEventListener('beforeunload', () => { if (mode() === 'play') SF.save?.store(); });
      window.requestAnimationFrame(frame);
      return { scene, camera, renderer };
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => SF.main.boot(), { once: true });
  else SF.main.boot();
})();
