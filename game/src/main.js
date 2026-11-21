(() => {
  const SF = globalThis.SF ||= {};
  function boot() {
    const world = SF.world;
    const scene = SF.render?.scene || world?.scene;
    world?.build?.(scene);
    for (const system of ['render', 'player', 'vehicles', 'traffic', 'peds', 'police', 'weapons']) {
      SF[system]?.init?.(scene);
    }
    const canvas = SF.render?.renderer?.domElement;
    if (canvas) document.getElementById('canvas-container').appendChild(canvas);
    const newGame = () => {
      SF.save.clear();
      start(null);
    };
    function start(saved) {
      SF.audio.unlock();
      SF.runtime.start(saved);
      menu.hidden = true;
      menu.style.display = 'none';
      SF.input.lock(canvas);
    }
    const actions = [
      ['New Game', 'new-game', newGame],
      ['Continue', 'continue', () => { const saved = SF.save.load(); if (saved) start(saved); }],
      ['How to Play', 'how-to-play', () => { help.hidden = !help.hidden; }]
    ];
    const buttons = [...document.querySelectorAll('button')];
    const find = (label, id) => document.getElementById(id)
      || buttons.find(button => button.textContent.trim().toLowerCase() === label.toLowerCase());
    const existing = find('New Game', 'new-game');
    const menu = document.querySelector('#start-menu, #menu, [data-start-menu]')
      || existing?.parentElement || document.createElement('section');
    if (!menu.isConnected) {
      Object.assign(menu.style, {
        position: 'fixed', zIndex: '10', top: '18%', left: '8%',
        padding: '1.4rem', color: '#fff', background: '#171725',
        fontFamily: 'system-ui, sans-serif'
      });
      const title = document.createElement('h1');
      title.textContent = 'Sunfall';
      menu.append(title);
      document.body.append(menu);
    }
    const help = document.createElement('p');
    help.hidden = true;
    help.textContent = 'WASD moves or drives. Mouse looks around. P pauses. M starts the next story job. Keys 1–4 start activities when no job is active.';
    menu.append(help);
    for (const [label, id, action] of actions) {
      const button = find(label, id) || document.createElement('button');
      if (!button.isConnected) {
        button.id = id;
        button.textContent = label;
        menu.insertBefore(button, help);
      }
      if (id === 'continue') button.disabled = !SF.save.saved;
      button.addEventListener('click', action);
    }
    canvas?.addEventListener('click', () => {
      if (SF.state.mode === 'play') SF.input.lock(canvas);
    });
    const shot = new URLSearchParams(location.search).get('shot');
    let appliedShot = false, last, orbit = 0;
    function frame(now) {
      const dt = last === undefined ? 0 : Math.min((now - last) / 1000, 0.05);
      last = now;
      SF.runtime.step(dt);
      if (shot && !appliedShot && typeof SF.shots?.apply === 'function') {
        SF.shots.apply(shot);
        appliedShot = true;
      }
      const pos = SF.runtime.position();
      const rig = SF.render;
      const camera = rig?.camera || world?.camera || SF.camera;
      if (!appliedShot && camera?.position && pos) {
        if (SF.state.mode === 'menu') {
          orbit += dt * 0.21;
          if (rig?.titleSweep) rig.titleSweep(orbit);
          else {
            camera.position.set(pos.x + 52 * Math.cos(orbit), pos.y + 29, pos.z + 52 * Math.sin(orbit));
            camera.lookAt(pos.x, pos.y + 2, pos.z);
          }
        } else if (SF.state.mode === 'play') {
          const yaw = SF.input.yaw, pitch = SF.input.pitch;
          const radius = SF.runtime.vehicle() ? 12 : 6;
          camera.position.set(pos.x + radius * Math.sin(yaw), pos.y + 3 + radius * Math.sin(pitch), pos.z + radius * Math.cos(yaw));
          camera.lookAt(pos.x, pos.y + 1.5, pos.z);
        }
      }
      SF.shots?.updateCamera?.();
      const renderer = rig?.renderer;
      const renderScene = rig?.scene || world?.scene || scene;
      rig?.prepare?.();
      if (renderer && renderScene && camera) renderer.render(renderScene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
