(function (SF) {
  'use strict';
  const byId = id => document.getElementById(id), hud = byId('hud'), start = byId('start'), pause = byId('pause');
  let bannerTimer = 0, started = false;
  const canvas = byId('minimap'), ctx = canvas.getContext('2d');
  function showBanner(title, text) { byId('mission').innerHTML = `<strong>${escapeText(title)}</strong><br><small>${escapeText(text || '')}</small>`; bannerTimer = 7; }
  function escapeText(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function minimap() {
    const w = canvas.width, h = canvas.height, p = SF.player.pos, scale = 0.25;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#18232a'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    ctx.translate(w / 2, h / 2); ctx.scale(scale, scale); ctx.translate(-p.x, -p.z);
    const bounds = SF.world.bounds || { minX: -620, maxX: 620, minZ: -620, maxZ: 620 };
    ctx.fillStyle = '#252a30'; ctx.fillRect(bounds.minX, bounds.minZ, bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
    ctx.fillStyle = '#245d76'; ctx.fillRect(bounds.minX - 110, bounds.minZ, Math.max(0, SF.world.coastX - bounds.minX + 110), bounds.maxZ - bounds.minZ);
    ctx.strokeStyle = '#888780'; ctx.lineWidth = SF.CONFIG.city.roadWidth; ctx.beginPath();
    for (const r of SF.world.roadCenters || []) { ctx.moveTo(r, bounds.minZ); ctx.lineTo(r, bounds.maxZ); ctx.moveTo(bounds.minX, r); ctx.lineTo(bounds.maxX, r); } ctx.stroke();
    function dot(pos, color, radius) { if (!pos) return; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(pos.x, pos.z, radius, 0, Math.PI * 2); ctx.fill(); }
    dot(SF.missions.food, '#59d27c', 7); dot(SF.missions.home, '#f4f4e8', 7);
    if (SF.missions.current) dot(SF.missions.markerPos, '#ffc45f', 9);
    for (const c of SF.police.cars) if (c.mesh.visible) dot(c.pos, '#e55550', 7);
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(SF.player.inCar ? SF.player.inCar.heading : SF.player.mesh.rotation.y); ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 4); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function refreshSaveButtons() {}
  const api = { update(dt) {
    if (!started) return;
    hud.style.display = 'block'; byId('healthFill').style.width = `${SF.player.health}%`;
    byId('cash').textContent = `$${Math.floor(SF.player.cash)}`;
    byId('wanted').textContent = '★'.repeat(SF.police.wanted) + '☆'.repeat(5 - SF.police.wanted);
    const busted = byId('busted'), wasted = byId('wasted');
    busted.classList.toggle('hidden', SF.player.reason !== 'busted' || !SF.player.recovering);
    wasted.classList.toggle('hidden', SF.player.reason !== 'wasted' || !SF.player.recovering);
    if (bannerTimer > 0 && (bannerTimer -= dt) <= 0) byId('mission').textContent = 'SOLANO BAY';
    minimap();
    if (SF.input.pressed('pause')) { SF.input.setPaused(!SF.input.paused); pause.classList.toggle('hidden', !SF.input.paused); }
  }, showBanner, refreshSaveButtons,
    begin() { started = true; start.classList.add('hidden'); hud.style.display = 'block'; SF.input.started = true; SF.missions.start(); if (SF.audio) SF.audio.init(); },
    setStarted(v) { started = !!v; hud.style.display = started ? 'block' : 'none'; start.classList.toggle('hidden', started); }
  };
  start.addEventListener('click', () => api.begin());
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && started && !SF.input.paused) {} });
  api.setStarted(false); SF.hud = api;
})(window.SF);
