(function (SF) {
  'use strict';
  const home = new THREE.Vector3(99, 0, 46), food = new THREE.Vector3(-85, 0, 46), group = new THREE.Group();
  SF.render.scene.add(group);
  const hm = new THREE.Mesh(new THREE.CylinderGeometry(1, 2.2, 15, 8), new THREE.MeshBasicMaterial({ color: 0xf0bb62, transparent: true, opacity: 0.26 })); hm.position.y = 7.5; group.add(hm);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 12), new THREE.MeshBasicMaterial({ color: 0xf0bb62 })); base.position.y = 0.2; group.add(base);
  const fm = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.7, 8, 7), new THREE.MeshBasicMaterial({ color: 0x54c17d, transparent: true, opacity: 0.25 })); fm.position.set(food.x, 4, food.z); group.add(fm);
  function marker(pos, color) { const m = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.8, 0.25, 10), new THREE.MeshBasicMaterial({ color })); b.position.y = 0.22; m.add(b); const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.2, 9, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28 })); beam.position.y = 4.7; m.add(beam); m.position.copy(pos); group.add(m); return m; }
  const jobMarker = marker(home, 0xf0bb62), sideMarkers = [];
  const story = [
    { title: 'A borrowed ride', text: 'Nico needs a parcel carried across Solano Bay.', stage: 'deliver', target: new THREE.Vector3(99, 0, -138), reward: 450, pistol: true },
    { title: 'Loose ends', text: 'Meet Mara beneath the downtown lights.', stage: 'go-to', target: new THREE.Vector3(-177, 0, 230), reward: 800 },
    { title: 'The long way', text: 'Make the coast road before the clock runs out.', stage: 'race-the-clock', target: new THREE.Vector3(-455, 0, -138), reward: 1250, time: 95 },
    { title: 'Heat on the bay', text: 'Lose the tail. Break line of sight and cool the heat.', stage: 'escape-with-heat', target: home, heat: 2, reward: 1600 },
    { title: 'Night crossing', text: 'Bring the package home without losing it. Final payout: $2400.', stage: 'deliver', target: new THREE.Vector3(7, 0, -322), reward: 2400 }
  ];
  const missions = { home, food, current: null, storyDone: 0, elapsed: 0, failedText: '', jobs: 0,
    start() { if (this.current) return; if (this.storyDone < story.length) this.activate(story[this.storyDone], true); else this.sideJob(); },
    activate(def, isStory) {
      this.current = Object.assign({}, def, { isStory: !!isStory, started: false }); this.elapsed = 0;
      this.markerPos.copy(this.current.target); jobMarker.position.copy(this.markerPos); jobMarker.visible = true;
      SF.hud.showBanner(this.current.title, this.current.text);
    },
    markerPos: home.clone(),
    sideJob() {
      this.jobs++; const taxi = this.jobs % 2 === 1, target = taxi ? new THREE.Vector3(roads[2], 0, roads[7]) : new THREE.Vector3(roads[8], 0, roads[3]);
      this.activate({ title: taxi ? 'Taxi fare' : 'Package run', text: taxi ? 'Pick up the fare and make the drop.' : 'Carry the package across town.', stage: 'deliver', target, reward: taxi ? 300 : 425 }, false);
    },
    fail(text) { if (!this.current) return; this.failedText = text; SF.hud.showBanner('JOB LOST', text); if (this.current.isStory) this.current.started = false; else this.current = null; jobMarker.visible = false; },
    update(dt) {
      const m = this.current; if (!m) { jobMarker.rotation.y += dt * 0.7; return; }
      this.elapsed += dt; jobMarker.rotation.y += dt * 0.7;
      if (m.stage === 'race-the-clock' && this.elapsed >= m.time) { this.fail('The window closed.'); return; }
      if (!m.started && SF.player.pos.distanceTo(m.target) < 8) { m.started = true; SF.hud.showBanner(m.title, m.stage === 'escape-with-heat' ? 'Lose the police.' : 'The handoff is close.'); }
      if (m.stage === 'escape-with-heat' && m.started && SF.police.wanted === 0) this.complete(m);
      else if (m.started && m.stage !== 'escape-with-heat') this.complete(m);
    },
    complete(m) {
      SF.player.addCash(m.reward); SF.hud.showBanner('DELIVERED', `${m.title}  +$${m.reward}`);
      if (m.pistol) SF.player.pistolUnlocked = true;
      if (m.isStory) this.storyDone++;
      this.current = null; jobMarker.visible = false;
      if (this.storyDone >= story.length) SF.hud.showBanner('SOLANO BAY', 'The city is yours. Pick up a taxi fare or package run.');
      SF.save.store();
    },
    loadProgress(n) { this.storyDone = Math.max(0, Math.min(story.length, n | 0)); },
    reset() { this.current = null; this.storyDone = 0; jobMarker.visible = false; }
  };
  missions.story = story; missions.group = group;
  SF.missions = missions;
  const roads = SF.world.roadCenters;
})(window.SF);
