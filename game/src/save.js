(function (SF) {
  'use strict';
  const key = 'sunfall-save-v2', version = 2, defaults = { version, cash: 80, storyDone: 0, pistolUnlocked: false, settings: { mute: false } };
  const data = Object.assign({}, defaults);
  const save = { data,
    load() {
      try { const parsed = JSON.parse(localStorage.getItem(key) || 'null'); if (parsed && typeof parsed === 'object' && parsed.version === version) { Object.assign(data, parsed); data.settings = Object.assign({}, defaults.settings, parsed.settings); } } catch (_) {}
      if (SF.player) { SF.player.cash = Math.max(0, Number(data.cash) || 80); SF.player.pistolUnlocked = !!data.pistolUnlocked; }
      if (SF.missions) SF.missions.loadProgress(data.storyDone || 0);
      if (SF.audio) SF.audio.mute(!!data.settings.mute);
      return data;
    },
    store() {
      data.version = version; data.cash = SF.player ? SF.player.cash : data.cash; data.storyDone = SF.missions ? SF.missions.storyDone : data.storyDone;
      data.pistolUnlocked = SF.player ? SF.player.pistolUnlocked : data.pistolUnlocked;
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
      return data;
    },
    reset() { Object.assign(data, JSON.parse(JSON.stringify(defaults))); try { localStorage.removeItem(key); } catch (_) {} if (SF.player) { SF.player.cash = 80; SF.player.pistolUnlocked = false; SF.player.health = 100; } if (SF.missions) SF.missions.reset(); }
  };
  SF.save = save;
})(window.SF);
