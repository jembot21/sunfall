(function () {
  'use strict';
  const SF = window.SF = window.SF || {};
  SF.state = { mode: 'menu', elapsed: 0, district: 'Palma Strand', currentDistrict: null };
  const order = ['player', 'vehicles', 'traffic', 'peds', 'weapons', 'police', 'missions', 'phone', 'world', 'audio'];
  function districtAt(p) {
    const city = SF.city;
    if (typeof city?.districtAt === 'function') return city.districtAt(p.x, p.z);
    if (typeof city?.getDistrict === 'function') return city.getDistrict(p.x, p.z);
    const districts = city?.districts || SF.CONFIG?.districts || SF.CONFIG?.DISTRICTS || SF.districts || [];
    const list = Array.isArray(districts) ? districts : Object.values(districts);
    return list.find(d => {
      const b = d.bounds;
      return b && p.x >= (b.minX ?? b.x1) && p.x <= (b.maxX ?? b.x2) && p.z >= (b.minZ ?? b.z1) && p.z <= (b.maxZ ?? b.z2);
    }) || null;
  }
  SF.runtime = {
    accumulator: 0, fixedStep: 1 / 60,
    setMode(mode) {
      if (!['menu', 'play', 'pause', 'busted', 'wasted'].includes(mode)) return;
      SF.state.mode = mode;
      if (SF.render) SF.render.mode = mode;
      if (mode !== 'play') SF.input?.unlock();
      SF.ui?.setMode?.(mode); SF.hud?.setMode?.(mode);
    },
    tick(dt) {
      SF.state.elapsed += dt;
      if (SF.render) SF.render.elapsed = SF.state.elapsed;
      for (const key of order) SF[key]?.update?.(dt, SF.state.elapsed);
      const p = SF.player?.mesh?.position || SF.player?.position;
      if (p) {
        const d = districtAt(p);
        if (d) { SF.state.currentDistrict = d; SF.state.district = typeof d === 'string' ? d : d.name; }
      }
      if (SF.player?.health <= 0) this.setMode('wasted');
      else if (SF.player?.busted || SF.police?.busted) this.setMode('busted');
    },
    update(dt) {
      dt = Math.min(0.1, Math.max(0, Number(dt) || 0));
      let stepped = false;
      if (SF.input?.pressed('Escape') || SF.input?.pressed('KeyP')) {
        if (SF.state.mode === 'play') this.setMode('pause');
        else if (SF.state.mode === 'pause') this.setMode('play');
      }
      if (SF.state.mode === 'play') {
        this.accumulator += dt;
        while (this.accumulator >= this.fixedStep && SF.state.mode === 'play') { this.tick(this.fixedStep); this.accumulator -= this.fixedStep; stepped = true; }
      } else { this.accumulator = 0; SF.audio?.update?.(dt); }
      SF.hud?.update?.(dt); SF.ui?.update?.(dt);
      if (stepped || SF.state.mode !== 'play') SF.input?.endFrame();
    },
    step(dt) { this.update(dt); }
  };
})();
