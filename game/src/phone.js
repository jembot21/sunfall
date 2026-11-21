(function () {
  'use strict';
  const SF = window.SF = window.SF || {};
  SF.phone = {
    queue: [], current: null, clock: 0, duration: 6,
    call(caller, line) {
      this.queue.push({ caller: String(caller), line: String(line) });
      this.next();
    },
    next() {
      if (!this.current && this.queue.length) this.current = { ...this.queue.shift(), startedAt: this.clock };
    },
    update(dt) {
      this.clock += Math.max(0, dt);
      if (this.current && this.clock - this.current.startedAt >= this.duration) this.current = null;
      this.next();
    },
    clear() { this.queue.length = 0; this.current = null; this.clock = 0; }
  };
})();
