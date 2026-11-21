(function (root) {
  'use strict';
  var SF = root.SF = root.SF || {};
  var ui = {}, initialized = false, pulseTimer = 0, lastStars = 0, lastDistrict = '';
  var COLORS = { ink: '#07141b', panel: 'rgba(6, 18, 25, .88)', teal: '#54e0cf', coral: '#ff7068', paper: '#f4eadb', muted: '#9eb1b4' };
  function el(tag, cls, parent) {
    var node = root.document.createElement(tag); if (cls) node.className = cls;
    if (parent) parent.appendChild(node); return node;
  }
  function style(node, values) { if (!node || !node.style) return; Object.keys(values).forEach(function (k) { node.style[k] = values[k]; }); }
  function panel(node) { style(node, { color: COLORS.paper, background: COLORS.panel, border: '1px solid rgba(84,224,207,.28)', borderRadius: '8px', boxShadow: '0 10px 34px rgba(0,0,0,.32)', font: '600 14px/1.35 system-ui, sans-serif', textShadow: '0 1px 2px #000' }); }
  function init() {
    if (initialized || !root.document || !root.document.body) return ui;
    initialized = true;
    var css = el('style', '', root.document.head || root.document.body);
    css.textContent = '.sf-hud{position:fixed;inset:0;pointer-events:none;z-index:20;font-family:system-ui,sans-serif;color:#f4eadb}.sf-hud *{box-sizing:border-box}.sf-map{position:absolute;left:24px;bottom:24px;width:190px;height:190px;border-radius:50%;overflow:hidden;border:2px solid rgba(240,234,219,.85);box-shadow:0 5px 25px #0009;background:rgba(5,20,26,.84)}.sf-top{position:absolute;right:26px;top:22px;text-align:right;padding:10px 15px;min-width:172px}.sf-banner{position:absolute;left:50%;top:24px;transform:translate(-50%,-140%);opacity:0;transition:transform .42s cubic-bezier(.2,.8,.2,1),opacity .32s;background:rgba(6,18,25,.92);border:1px solid rgba(84,224,207,.55);padding:13px 24px;border-radius:8px;min-width:300px;text-align:center}.sf-banner.visible{transform:translate(-50%,0);opacity:1}.sf-prompt{position:absolute;bottom:42px;left:50%;transform:translateX(-50%);padding:9px 18px;min-width:120px;text-align:center}.sf-dialogue{position:absolute;left:50%;bottom:122px;transform:translateX(-50%);max-width:min(680px,80vw);padding:13px 22px;text-align:center}.sf-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(3,10,16,.73);pointer-events:auto}.sf-card{width:min(480px,90vw);padding:30px;background:rgba(7,20,27,.96);border:1px solid rgba(84,224,207,.4);border-radius:12px;text-align:center;box-shadow:0 20px 70px #0009}.sf-card button{pointer-events:auto;background:#54e0cf;color:#08191e;border:0;padding:12px 20px;border-radius:5px;margin:7px;font-weight:800;cursor:pointer}.sf-complete{position:absolute;left:50%;top:35%;transform:translate(-50%,-50%);padding:22px 38px;text-align:center}.sf-star-pulse{animation:sfPulse .34s ease-out}@keyframes sfPulse{50%{transform:scale(1.22);filter:brightness(1.8)}}';
    css.textContent += '.sf-card h1{font:900 64px/.95 Impact,sans-serif;letter-spacing:.04em;margin:0 0 24px}.sf-banner{max-width:550px}.sf-banner>div:first-child{color:#54e0cf;font-size:12px;text-transform:uppercase;letter-spacing:.16em;margin-bottom:5px}.sf-tracker{position:absolute;left:24px;top:24px;padding:12px 16px;width:240px;font-size:12px}.sf-menu>:not(.sf-overlay){display:none!important}';
    ui.root = el('div', 'sf-hud', root.document.body); ui.root.setAttribute('aria-live', 'polite');
    ui.tracker=el('div','sf-tracker',ui.root);panel(ui.tracker);
    ui.map = el('canvas', 'sf-map', ui.root); ui.map.width = 380; ui.map.height = 380; ui.mapCtx = ui.map.getContext && ui.map.getContext('2d');
    ui.top = el('div', 'sf-top', ui.root); panel(ui.top);
    ui.cash = el('div', '', ui.top); ui.cash.style.fontSize = '20px';
    ui.stars = el('div', '', ui.top); ui.stars.style.fontSize = '24px'; ui.stars.style.letterSpacing = '3px';
    ui.banner = el('div', 'sf-banner', ui.root); panel(ui.banner); ui.bannerTitle = el('div', '', ui.banner); ui.bannerText = el('div', '', ui.banner);
    ui.prompt = el('div', 'sf-prompt', ui.root); panel(ui.prompt); ui.prompt.style.display = 'none';
    ui.dialogue = el('div', 'sf-dialogue', ui.root); panel(ui.dialogue); ui.dialogue.style.display = 'none';
    ui.complete = el('div', 'sf-complete', ui.root); panel(ui.complete); ui.complete.style.display = 'none';
    return ui;
  }
  function position(obj) {
    if (!obj) return { x: 0, z: 0 };
    if (obj.position) obj = obj.position;
    return { x: Number(obj.x) || 0, z: Number(obj.z != null ? obj.z : obj.y) || 0 };
  }
  function playerPosition() { return position(SF.player && (SF.player.position || SF.player.mesh || SF.player)); }
  function wanted() {
    var p = SF.police || {}, w = p.stars != null ? p.stars : p.wanted || p.wantedState || {};
    var level = typeof w === 'number' ? w : (w.level != null ? w.level : (w.stars != null ? w.stars : (p.wantedLevel != null ? p.wantedLevel : p.level)));
    return Math.max(0, Math.min(5, Math.floor(Number(level) || 0)));
  }
  function district() {
    var p = playerPosition(), ds = SF.missions && SF.missions.districts || [];
    if (!ds.length) return '';
    var nearest = ds[0], best = Infinity;
    ds.forEach(function (d) { var dx = p.x - d.x, dz = p.z - d.z, q = dx * dx + dz * dz; if (q < best) { best = q; nearest = d; } });
    return nearest.name || '';
  }
  function policePositions() {
    var p = SF.police || {}, raw = p.units || p.cars || p.patrols || p.officers || [];
    if (!Array.isArray(raw)) raw = Object.keys(raw).map(function (k) { return raw[k]; });
    return raw.map(function(u) { return position(u.car ? u.car.mesh : u.mesh || u); });
  }
  function drawMap() {
    var c = ui.mapCtx; if (!c) return;
    var size = ui.map.width, center = size / 2, scale = size / 260, p = playerPosition(), mission = SF.missions && SF.missions.active;
    c.clearRect(0, 0, size, size); c.save(); c.beginPath(); c.arc(center, center, center - 2, 0, Math.PI * 2); c.clip();
    c.fillStyle = 'rgba(8,28,34,.96)'; c.fillRect(0, 0, size, size);
    var ds = SF.missions && SF.missions.districts || [], d = district();
    ds.forEach(function (area, i) {
      var x = center + (area.x - p.x) * scale, y = center + (area.z - p.z) * scale;
      c.fillStyle = area.name === d ? 'rgba(33,119,112,.27)' : (i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(84,224,207,.045)');
      c.beginPath(); c.arc(x, y, 67, 0, Math.PI * 2); c.fill();
    });
    c.strokeStyle = 'rgba(196,211,203,.28)'; c.lineWidth = 3;
    for (var i = 0; i < 10; i++) {
      var road=-288+i*64, ox=center+(road-p.x)*scale, oz=center+(road-p.z)*scale;
      c.beginPath(); c.moveTo(ox, 0); c.lineTo(ox, size); c.stroke();
      c.beginPath(); c.moveTo(0, oz); c.lineTo(size, oz); c.stroke();
    }
    if (mission && mission.path) {
      c.beginPath(); c.strokeStyle = 'rgba(65,222,207,.72)'; c.lineWidth = 5;
      mission.path.forEach(function (m, i) { var x = center + (m.x - p.x) * scale, y = center + (m.z - p.z) * scale; if (!i) c.moveTo(x, y); else c.lineTo(x, y); }); c.stroke();
    }
    if (mission && mission.nearestMarker) {
      var m = mission.nearestMarker, mx = center + (m.x - p.x) * scale, my = center + (m.z - p.z) * scale;
      c.fillStyle = COLORS.teal; c.beginPath(); c.arc(mx, my, 9, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#e3fff9'; c.lineWidth = 2; c.stroke();
    }
    policePositions().forEach(function (q) {
      var x = center + (q.x - p.x) * scale, y = center + (q.z - p.z) * scale;
      c.fillStyle = COLORS.coral; c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill();
    });
    if(SF.police && SF.police.drawMinimap) SF.police.drawMinimap(c,function(x,z){return {x:center+(x-p.x)*scale,y:center+(z-p.z)*scale};},scale);
    var yaw = SF.player ? SF.player.heading : 0;
    c.save(); c.translate(center, center); c.rotate(-yaw); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -16); c.lineTo(11, 12); c.lineTo(0, 7); c.lineTo(-11, 12); c.closePath(); c.fill(); c.restore(); c.restore();
  }
  function update(dt) {
    init(); if (!initialized) return;
    var money = SF.missions && SF.missions.cash;
    if (money == null && SF.save && SF.save.data) money = SF.save.data.cash;
    ui.cash.textContent = '$' + Math.floor(Number(money) || 0).toLocaleString('en-US');
    var stars = wanted(); ui.stars.textContent = '';
    for (var i = 1; i <= 5; i++) {
      var star = el('span', '', ui.stars); star.textContent = i <= stars ? '★' : '☆';
      star.style.color = i <= stars ? '#ffd466' : 'rgba(244,234,219,.38)';
      star.setAttribute('aria-label', i <= stars ? 'wanted star filled' : 'wanted star empty');
    }
    if (stars > lastStars) { ui.stars.classList.add('sf-star-pulse'); pulseTimer = 0.4; }
    if (pulseTimer > 0) { pulseTimer -= Number(dt) || 0; if (pulseTimer <= 0) ui.stars.classList.remove('sf-star-pulse'); }
    lastStars = stars; drawMap();
    var active = SF.missions && SF.missions.active;
    if (active) {
      ui.bannerTitle.textContent = active.title;
      ui.bannerText.textContent = active.objectiveText;
      ui.banner.classList.add('visible');
      var p=playerPosition(),m=active.nearestMarker;
      ui.tracker.textContent='SOLANO BAY · '+district()+' · '+(active.stage+1)+' / '+active.stages.length+' · '+(m?Math.round(Math.hypot(p.x-m.x,p.z-m.z)):0)+' m';
      ui.tracker.style.display='block';
    } else {
      ui.tracker.style.display='none';
    }
    var now = district();
    if (now && now !== lastDistrict) { lastDistrict = now; if (SF.hud.onDistrictChange) SF.hud.onDistrictChange(now); }
  }
  function acceptMission(title, text) { init(); if (!initialized) return; ui.bannerTitle.textContent = title || ''; ui.bannerText.textContent = text || ''; ui.banner.classList.add('visible'); }
  function setObjective(title, text) { init(); if (!initialized) return; ui.bannerTitle.textContent = title || ''; ui.bannerText.textContent = text || ''; ui.banner.classList.add('visible'); }
  function prompt(text) { init(); if (!initialized) return; ui.prompt.textContent = text || ''; ui.prompt.style.display = text ? 'block' : 'none'; }
  function dialogue(line, speaker) { init(); if (!initialized) return; ui.dialogue.textContent = line ? (speaker ? speaker + ': ' : '') + line : ''; ui.dialogue.style.display = line ? 'block' : 'none'; }
  function showComplete(title, cash) { init(); if (!initialized) return; ui.complete.innerHTML = ''; var h = el('div', '', ui.complete); h.textContent = 'JOB COMPLETE'; h.style.color = COLORS.teal; h.style.letterSpacing = '3px'; var t = el('div', '', ui.complete); t.textContent = title || ''; t.style.fontSize = '22px'; t.style.margin = '8px 0'; var p = el('div', '', ui.complete); p.textContent = '+$' + (Number(cash) || 0).toLocaleString('en-US'); p.style.color = '#ffd466'; ui.complete.style.display = 'block'; root.setTimeout(function () { if (ui.complete) ui.complete.style.display = 'none'; }, 3000); }
  function overlay(title, subtitle, buttons) {
    init(); if (!initialized) return null;
    if (ui.overlay && ui.overlay.parentNode) ui.overlay.parentNode.removeChild(ui.overlay);
    var shade = el('div', 'sf-overlay', ui.root), card = el('div', 'sf-card', shade); panel(card);
    var h = el('h1', '', card); h.textContent = title; h.style.color = COLORS.teal;
    var p = el('p', '', card); p.textContent = subtitle || '';
    (buttons || []).forEach(function (b) { var button = el('button', '', card); button.type = 'button'; button.textContent = b.label; button.addEventListener('click', b.onClick); });
    ui.overlay = shade; return shade;
  }
  function closeOverlay() { if (ui.overlay && ui.overlay.parentNode) ui.overlay.parentNode.removeChild(ui.overlay); ui.overlay = null; }
  SF.hud = {
    init: init,
    update: update,
    prompt: prompt,
    dialogue: dialogue,
    acceptMission: acceptMission,
    setObjective: setObjective,
    showComplete: showComplete,
    showPause: function (resume, quit) { return overlay('Paused', 'The bay can wait.', [{ label: 'Resume', onClick: resume || closeOverlay }, { label: 'Title screen', onClick: quit || closeOverlay }]); },
    showTitle: overlay,
    closeOverlay: closeOverlay,
    onDistrictChange: function (name) { if (SF.main && SF.main.flashDistrict) SF.main.flashDistrict(name); },
    get elements() { init(); return ui; }
  };
})(globalThis);
