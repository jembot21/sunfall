(() => {
  const SF = globalThis.SF ||= {};
  const queue = [];
  const clock = () => performance.now();
  SF.phone = {
    current: null,
    call(caller, line) {
      if (queue.length >= 16) return false;
      queue.push({ caller, line });
      this.update();
      return true;
    },
    update() {
      const now = clock();
      if (this.current && now - this.current.startedAt >= 6000) this.current = null;
      if (!this.current && queue.length) this.current = { ...queue.shift(), startedAt: now };
    },
    clear() {
      queue.length = 0;
      this.current = null;
    }
  };
})();
