/* Live presentation only: the simulation owns every value shown here. */
(function () {
  'use strict';
  const SF = window.SF;
  const el = id => document.getElementById(id);
  const text = (id, value) => { const node = el(id); if (node && node.textContent !== String(value)) node.textContent = value; };
  const show = (id, visible) => { const node = el(id); if (node) node.hidden = !visible; };
  const position = item => item?.mesh?.position || item?.car?.mesh?.position || item?.vehicle?.mesh?.position || item?.position;
  const air = unit => /air|heli/i.test(`${unit.kind} ${unit.callsign}`);
  const money = value => '$' + Math.round(Number(value) || 0).toLocaleString('en-US');
  let last = 0, bound = false;

  function map(canvas, full) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    const p = position(SF.player) || { x: 0, z: 0 };
    const scale = full ? Math.min(w, h) / 1200 : w / 230;
    const origin = full ? { x: 0, z: 0 } : p;
    const xy = q => [w / 2 + (q.x - origin.x) * scale, h / 2 + (q.z - origin.z) * scale];
    ctx.clearRect(0, 0, w, h); ctx.save();
    if (!full) { ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); ctx.clip(); }
    ctx.fillStyle = '#172d32'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#77827c'; ctx.lineWidth = full ? 3 : 9;
    for (const street of SF.city?.streets || []) {
      const a = street.start || street.from || street.a;
      const b = street.end || street.to || street.b;
      ctx.beginPath();
      if (a && b && typeof a === 'object') { ctx.moveTo(...xy(a)); ctx.lineTo(...xy(b)); }
      else if (street.axis === 'z' && Number.isFinite(street.x)) { const x = xy({ x: street.x, z: 0 })[0]; ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      else if (Number.isFinite(street.z)) { const y = xy({ x: 0, z: street.z })[1]; ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
    }
    const dot = (q, color, radius, diamond) => {
      if (!q) return;
      const [x, y] = xy(q); ctx.fillStyle = color; ctx.strokeStyle = '#102027'; ctx.lineWidth = 2;
      ctx.beginPath();
      if (diamond) { ctx.moveTo(x, y - radius); ctx.lineTo(x + radius, y); ctx.lineTo(x, y + radius); ctx.lineTo(x - radius, y); ctx.closePath(); }
      else ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    };
    const marker = SF.missions?.marker || SF.missions?.active?.marker || SF.world?.markers?.find(item => item.kind === 'mission');
    dot(position(marker) || marker, '#49e7d2', 9, true);
    for (const unit of SF.police?.units || []) dot(position(unit) || position(unit.vehicle), air(unit) ? '#d8e9ff' : '#409aff', air(unit) ? 10 : 6, air(unit));
    const [x, y] = xy(p); ctx.translate(x, y); ctx.rotate(-(SF.player?.heading || SF.input?.yaw || 0));
    ctx.fillStyle = '#fff4e7'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 9); ctx.lineTo(0, 5); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function bind() {
    if (bound || !el('hud')) return;
    bound = true;
    const on = (id, fn) => el(id)?.addEventListener('click', fn);
    on('resume-button', () => { SF.state.mode = 'play'; SF.input.lock(); });
    on('map-button', () => { SF.state.mode = 'map'; });
    on('close-map', () => { SF.state.mode = 'play'; });
    on('quit-button', () => { SF.state.mode = 'menu'; });
    for (const id of ['busted-continue', 'wasted-continue']) on(id, () => SF.runtime.start());
    on('mission-continue', () => { SF.state.mode = 'play'; });
  }

  function update(now = performance.now()) {
    if (now < 1) now = performance.now();
    bind();
    if (now - last < 80) return;
    last = now;
    const state = SF.state || {}, player = SF.player || {}, missions = SF.missions || {};
    const mode = state.mode;
    show('hud', mode !== 'menu'); show('start-screen', mode === 'menu');
    for (const [id, modes] of Object.entries({ pause: ['pause', 'paused'], busted: ['busted'], wasted: ['wasted', 'dead'], 'city-map': ['map'], 'mission-complete': ['complete', 'missionComplete', 'mission-complete'] })) show(id, modes.includes(mode));
    const district = state.district;
    text('district-name', district?.name || district || 'Palma Strand');
    const active = missions.active;
    const objective = typeof missions.objective === 'string' ? missions.objective : active?.objective || active?.title || 'Explore Solano Bay · E to meet the crew';
    text('objective-text', objective); text('mission-objective', objective);
    show('mission-banner', Boolean(active || SF.shots?.current === 'cover'));
    text('cash', money(player.cash ?? state.cash));
    const wanted = Math.max(0, Math.min(5, Math.floor(SF.police?.wanted || 0)));
    const stars = el('wanted-stars');
    if (stars) { stars.innerHTML = '★'.repeat(wanted) + '<span class="inactive">' + '★'.repeat(5 - wanted) + '</span>'; stars.setAttribute('aria-label', `Wanted level ${wanted}`); }
    show('dispatch', wanted > 0);
    const list = el('dispatch-units');
    if (list) {
      const units = [...(SF.police?.units || [])].sort((a, b) => Number(air(b)) - Number(air(a)) || (a.dist || 0) - (b.dist || 0));
      list.replaceChildren(...units.map(unit => {
        const row = document.createElement('div'); row.className = 'dispatch-row';
        const label = document.createElement('strong'), status = document.createElement('span');
        label.textContent = unit.callsign || (air(unit) ? 'AIR ONE' : 'PATROL UNIT');
        const playerPosition = position(SF.runtime?.vehicle?.() || player);
        const unitPosition = position(unit);
        const distance = playerPosition && unitPosition
          ? Math.hypot(playerPosition.x - unitPosition.x, playerPosition.z - unitPosition.z)
          : Number(unit.dist) || 0;
        status.textContent = `${unit.status || 'RESPONDING'} · ${Math.round(distance)} m`;
        row.append(label, status); return row;
      }));
    }
    const call = SF.phone?.current;
    show('phone-call', Boolean(call));
    if (call) {
      text('caller-name', call.caller); text('call-dialogue', call.line);
      const elapsed = Math.max(0, performance.now() - call.startedAt);
      const fill = el('call-progress-fill'); if (fill) fill.style.width = `${Math.max(0, 100 - elapsed / 60)}%`;
    }
    const car = player.vehicle || SF.runtime?.vehicle?.();
    show('vehicle-cluster', Boolean(car));
    if (car) {
      const types = SF.CONFIG.VEHICLE_TYPES;
      const type = typeof car.type === 'object' ? car.type : types[car.type ?? car.typeIndex ?? 0];
      text('vehicle-name', String(car.displayName || car.name || type?.name || 'Solano vehicle').toUpperCase());
      text('vehicle-speed', Math.round(Math.abs(car.speed ?? player.speed ?? 0) * 3.6));
    }
    const dialogue = SF.dialogue?.current || state.dialogue;
    show('dialogue', Boolean(dialogue));
    if (dialogue) { text('dialogue-speaker', dialogue.speaker || dialogue.caller || ''); text('dialogue-text', dialogue.text || dialogue.line || ''); }
    text('action-prompt', car ? 'E — EXIT VEHICLE   ·   SPACE — HANDBRAKE' : 'E — INTERACT / ENTER   ·   SHIFT — SPRINT');
    text('mission-reward', missions.reward ? money(missions.reward) : 'The crew will remember this.');
    map(el('minimap'), false); if (mode === 'map') map(el('city-map-canvas'), true);
  }
  SF.hud = { update, init: bind, map };
  function frame(now) { update(now); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
})();
