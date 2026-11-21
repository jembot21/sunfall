(() => {
  const SF = globalThis.SF ||= {};
  const key = 'sunfall-v3-save';
  SF.save = {
    get saved() { return this.load() !== null; },
    load() {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (!data || !Number.isFinite(data.cash) || !Number.isInteger(data.storyDone)) return null;
        return data;
      } catch { return null; }
    },
    store(data = SF.state) {
      if (!data) return false;
      const pos = data.safehouse || data.safehousePosition;
      const safehouse = pos && [pos.x, pos.y, pos.z].every(Number.isFinite)
        ? { x: pos.x, y: pos.y, z: pos.z } : null;
      try {
        localStorage.setItem(key, JSON.stringify({
          cash: data.cash ?? 0,
          storyDone: data.storyDone ?? SF.missions?.storyDone ?? 0,
          unlocks: data.unlocks ?? [],
          safehouse
        }));
        return true;
      } catch { return false; }
    },
    clear() {
      try { localStorage.removeItem(key); return true; } catch { return false; }
    }
  };
})();
