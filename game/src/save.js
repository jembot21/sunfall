(function () {
  'use strict';
  const SF = window.SF = window.SF || {};
  const KEY = 'sunfall-v3-round9';
  function read() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (!s || s.version !== 1 || !Number.isFinite(s.cash) || !Number.isInteger(s.storyDone) || s.storyDone < 0 || s.storyDone > 8) return null;
      if (!s.safehouse || !['x', 'y', 'z'].every(k => Number.isFinite(s.safehouse[k]))) return null;
      return s;
    } catch (_) { return null; }
  }
  SF.save = {
    saved: !!read(), key: KEY, unlocks: [], safehouse: { x: -511, y: 0.24, z: 273.5 },
    get hasSave() { return this.saved; },
    load() {
      const s = read(); this.saved = !!s;
      if (!s) return null;
      this.unlocks = Array.isArray(s.unlocks) ? s.unlocks.filter(x => typeof x === 'string') : [];
      this.safehouse = { ...s.safehouse };
      if (SF.player) {
        SF.player.cash = s.cash;
        const p = SF.player.mesh?.position || SF.player.position;
        if (p?.set) p.set(s.safehouse.x, s.safehouse.y, s.safehouse.z);
        else if (p) Object.assign(p, s.safehouse);
      }
      if (SF.missions) { SF.missions.storyDone = s.storyDone; SF.missions.active = null; SF.missions.refresh?.(); }
      for (const id of this.unlocks) SF.weapons?.unlock?.(id);
      return s;
    },
    store() {
      const data = { version: 1, cash: Math.max(0, Number(SF.player?.cash) || 0), storyDone: SF.missions?.storyDone || 0, unlocks: this.unlocks, safehouse: this.safehouse };
      try { localStorage.setItem(KEY, JSON.stringify(data)); this.saved = true; return true; }
      catch (_) { return false; }
    },
    clear() {
      try { localStorage.removeItem(KEY); } catch (_) { /* Private browsing may deny storage. */ }
      this.saved = false; this.unlocks = []; this.safehouse = { x: -511, y: 0.24, z: 273.5 };
    }
  };
})();
