(function (root) {
  'use strict';
  var SF = root.SF = root.SF || {};
  var state = { booted: false, playing: false, paused: false, time: 0, frame: 0, last: 0, raf: 0, districtTimer: 0, districtText: '', titleAngle: 0, lastSave: 0 };
  function call(target, names, args) {
    if (!target) return false;
    for (var i = 0; i < names.length; i++) if (typeof target[names[i]] === 'function') {
      try { target[names[i]].apply(target, args || []); return true; } catch (err) { if (root.console && console.warn) console.warn('Sunfall subsystem ' + names[i] + ' failed', err); }
    }
    return false;
  }
  function buildWorld() {
    call(SF.world, ['build', 'buildWorld', 'create', 'init']);
    call(SF.city, ['build', 'create', 'init']);
    call(SF.render, ['init', 'create', 'setup']);
    if (SF.world && SF.render && SF.render.scene && !SF.world.scene) SF.world.scene = SF.render.scene;
  }
  function getPlayerPosition() {
    var p = SF.player && (SF.player.position || SF.player.mesh && SF.player.mesh.position);
    return p || { x: 0, y: 0, z: 0 };
  }
  function saveProgress() {
    if (!SF.save || !SF.save.store) return;
    var p = getPlayerPosition();
    SF.save.store({ cash: SF.missions ? SF.missions.cash : 250, storyDone: SF.missions ? SF.missions.storyDone : 0, safehouse: { x: Number(p.x) || 0, y: Number(p.y) || 0, z: Number(p.z) || 0 } });
    state.lastSave = state.time;
  }
  function startGame(isContinue) {
    if (SF.audio) { SF.audio.resume(); SF.audio.startAmbience(); }
    var saved = SF.save && SF.save.load ? SF.save.load() : { cash: 250, storyDone: 0, safehouse: { x: 0, y: 0, z: 0 } };
    if (!isContinue && SF.save) { saved = SF.save.clear(); }
    if (SF.missions && SF.missions.restore) SF.missions.restore(saved);
    if (!isContinue && SF.player && SF.world.safehouse) saved.safehouse = SF.world.safehouse;
    if (saved.safehouse && SF.player) {
      var mesh = SF.player.mesh || SF.player;
      if (mesh.position && mesh.position.set) mesh.position.set(saved.safehouse.x, saved.safehouse.y, saved.safehouse.z);
      else if (mesh.position) Object.assign(mesh.position, saved.safehouse);
    }
    state.playing = true; state.paused = false;
    if (SF.hud) {
      SF.hud.closeOverlay();
      SF.hud.elements.root.classList.remove('sf-menu');
      if (SF.hud.elements && SF.hud.elements.root) SF.hud.elements.root.style.display = 'block';
    }
    if (SF.input && SF.input.lock && root.document && !root.__SUNFALL_HEADLESS__) SF.input.lock(SF.render && SF.render.renderer && SF.render.renderer.domElement);
    if (SF.missions && !SF.missions.active && SF.missions.storyDone < 8) SF.missions.begin(SF.missions.storyDone);
    saveProgress();
    state.lastSave = state.time;
  }
  function showTitle() {
    state.playing = false; state.paused = false;
    if (SF.audio) SF.audio.stopEngine();
    if (SF.hud) {
      var saved = !!(SF.save && SF.save.saved);
      SF.hud.elements.root.classList.add('sf-menu');
      SF.hud.showTitle('SUNFALL', 'Solano Bay · Walk / drive: WASD · Enter car: F · Job: E · Activities: T · Pause: P', [
        { label: 'New Game', onClick: function () { startGame(false); } },
        { label: saved ? 'Continue' : 'Continue — no save', onClick: function () { if (saved) startGame(true); } }
      ]);
      if (SF.hud.elements && SF.hud.elements.root) SF.hud.elements.root.style.display = 'block';
    }
  }
  function pause() {
    if (!state.playing || state.paused) return;
    state.paused = true; if (SF.input && SF.input.unlock) SF.input.unlock();
    if (SF.audio) SF.audio.stopEngine();
    saveProgress();
    if (SF.hud) SF.hud.showPause(function () { state.paused = false; SF.hud.closeOverlay(); }, showTitle);
  }
  function distance(a, b) { var x = (Number(a.x) || 0) - (Number(b.x) || 0), z = (Number(a.z) || 0) - (Number(b.z) || 0); return Math.sqrt(x * x + z * z); }
  function promptForAction() {
    if (!SF.missions || !SF.missions.active) { SF.hud && SF.hud.prompt(''); return; }
    var active = SF.missions.active, marker = active.nearestMarker, pos = getPlayerPosition(), near = marker && distance(pos, marker) < 32;
    var text = '';
    if (near) {
      var stage = active.stages[active.stage];
      text = stage && stage.type === 'drive' ? '[E] Get in and continue' : stage && stage.type === 'escape' ? 'Lose the patrols to finish' : '[E] Continue';
    }
    SF.hud && SF.hud.prompt(text);
  }
  function interact() {
    if (!SF.missions || !SF.missions.active) return;
    var active = SF.missions.active, stage = active.stages[active.stage], pos = getPlayerPosition();
    if (stage && stage.type === 'drive' && SF.vehicles) {
      call(SF.vehicles, ['enter', 'enterNearest', 'use', 'getIn'], []);
    }
    var police = SF.police || {}, units = police.units || police.cars || police.patrols || [], nearestPatrol = Infinity;
    if (!Array.isArray(units)) units = Object.keys(units).map(function (k) { return units[k]; });
    units.forEach(function (u) { var at = u && (u.car && u.car.mesh.position || u.mesh && u.mesh.position || u.position) || u; if (at && isFinite(at.x) && isFinite(at.z)) nearestPatrol = Math.min(nearestPatrol, distance(pos, at)); });
    SF.missions.interact({ distance: nearestPatrol, elapsed: active.stageElapsed, wanted: getWanted() });
  }
  function getWanted() {
    var p = SF.police || {}, w = p.stars != null ? p.stars : p.wanted || p.wantedState || {};
    return Number(typeof w === 'number' ? w : (w.level != null ? w.level : (w.stars != null ? w.stars : (p.wantedLevel != null ? p.wantedLevel : p.level)))) || 0;
  }
  function handleInput() {
    if (!SF.input) return;
    if (SF.input.consumePressed('Escape') || SF.input.consumePressed('KeyP')) { if (state.paused) { state.paused = false; SF.hud && SF.hud.closeOverlay(); } else if (state.playing) pause(); }
    if (!state.playing || state.paused) return;
    if (SF.input.consumePressed('KeyE')) interact();
    if (SF.input.consumePressed('KeyT') && SF.missions) {
      var p=getPlayerPosition();
      var nearest=SF.missions.activities.slice().sort(function(a,b){return distance(p,a.marker)-distance(p,b.marker);})[0];
      if(nearest) SF.missions.startActivity(nearest.id);
    }
    if (SF.input.consumePressed('KeyM') && SF.missions && SF.missions.active) {
      var line = SF.missions.active.giver ? SF.missions.active.giver + ': Keep this quiet and bring it back clean.' : 'The next marker is waiting.';
      SF.hud && SF.hud.dialogue(line, SF.missions.active.giver);
      root.setTimeout(function () { SF.hud && SF.hud.dialogue(''); }, 2600);
    }
    if (SF.input.mouseDown() && SF.weapons) call(SF.weapons, ['fire', 'shoot', 'trigger'], []);
  }
  function updateSubsystem(target, dt) { call(target, ['update', 'tick', 'step'], [dt, SF.input]); }
  function updateGame(dt) {
    updateSubsystem(SF.player, dt);
    if (SF.missions) {
      SF.missions.update(dt);
      var active = SF.missions.active;
      if (active && active.stages[active.stage] && active.stages[active.stage].type === 'escape') {
        var pos = getPlayerPosition(), nearest = Infinity, police = SF.police || {}, cops = police.units || police.cars || police.patrols || [];
        if (!Array.isArray(cops)) cops = Object.keys(cops).map(function (k) { return cops[k]; });
        cops.forEach(function (u) { var at = u && (u.car && u.car.mesh.position || u.mesh && u.mesh.position || u.position) || u; if (at && isFinite(at.x) && isFinite(at.z)) nearest = Math.min(nearest, distance(pos, at)); });
        var marker = active.nearestMarker;
        if (marker && distance(pos, marker) < 28 && SF.missions.escapeSatisfied({ wanted: getWanted(), elapsed: active.stageElapsed, distance: nearest })) SF.missions.advance();
      }
    }
    if (SF.audio) {
      var player = SF.player || {}, vehicle = player.car;
      if (vehicle) SF.audio.engineHum(Number(vehicle.speed) || 0); else SF.audio.stopEngine();
      SF.audio.sirenLoop(getWanted() > 0);
    }
    promptForAction();
    if (SF.hud) SF.hud.update(dt);
    if (state.time - state.lastSave > 45) saveProgress();
  }
  function render() {
    var r = SF.render || {};
    if (call(r, ['render', 'draw', 'frame'], [])) return;
    if (r.renderer && r.scene && r.camera && r.renderer.render) r.renderer.render(r.scene, r.camera);
    else if (SF.world && SF.world.scene && r.renderer && r.camera && r.renderer.render) r.renderer.render(SF.world.scene, r.camera);
  }
  function sweepTitle(dt) {
    state.titleAngle += dt * 0.035;
    var r = SF.render || {}, camera = r.camera || (r.renderer && r.renderer.camera);
    if (!camera) return;
    var radius = 24, x = Math.cos(state.titleAngle) * radius, z = Math.sin(state.titleAngle) * radius;
    if (camera.position) {
      if (camera.position.set) camera.position.set(x, 21 + Math.sin(state.titleAngle * 0.7) * 1.6, z);
      else Object.assign(camera.position, { x: x, y: 21, z: z });
    }
    if (camera.lookAt) camera.lookAt(0, 1, 0);
  }
  function frame(now) {
    if (!state.booted || root.__SUNFALL_STOP_LOOP__) return;
    var time = Number(now) || (Date.now());
    var dt = state.last ? Math.max(0, Math.min(0.05, (time - state.last) / 1000)) : 0.016;
    state.last = time; state.time += dt; state.frame++;
    if (state.playing) { handleInput(); if (!state.paused) updateGame(dt); }
    else if (!state.playing) sweepTitle(dt);
    render();
    if (root.requestAnimationFrame) state.raf = root.requestAnimationFrame(frame);
  }
  function flashDistrict(name) {
    state.districtText = name; state.districtTimer = 2.5;
    if (SF.hud && SF.hud.dialogue) SF.hud.dialogue(name.toUpperCase());
    root.setTimeout(function () { state.districtTimer = 0; if (SF.hud && SF.hud.dialogue) SF.hud.dialogue(''); }, 1800);
  }
  function boot(options) {
    options = options || {};
    if (state.booted) return SF.main;
    state.booted = true;
    if (options.headless) root.__SUNFALL_HEADLESS__ = true;
    buildWorld();
    if (SF.input && SF.input.bind) SF.input.bind(SF.render && SF.render.renderer && SF.render.renderer.domElement);
    if (SF.save && SF.save.load) SF.save.load();
    if (SF.missions && SF.missions.restore && SF.save) SF.missions.restore(SF.save.data);
    if (SF.hud && SF.hud.init) SF.hud.init();
    // Audio starts with the menu press so autoplay policies are respected.
    showTitle();
    if (options.autoLoop !== false && root.requestAnimationFrame) { state.last = 0; state.raf = root.requestAnimationFrame(frame); }
    return SF.main;
  }
  SF.main = {
    boot: boot,
    start: startGame,
    startGame: startGame,
    showTitle: showTitle,
    pause: pause,
    update: updateGame,
    frame: frame,
    flashDistrict: flashDistrict,
    get state() { return state; }
  };
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { boot(); }, { once: true });
    else root.setTimeout(function () { boot(); }, 0);
  }
})(globalThis);
