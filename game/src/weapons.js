(function () {
  'use strict';
  var defs = [
    {name: 'Fists', dmg: 34, rate: 0.55, mag: Infinity, range: 3.2, auto: false},
    {name: 'P9 Sidearm', dmg: 28, rate: 0.30, mag: 12, reserve: 120, range: 120, price: SF.CONFIG.prices.pistol},
    {name: 'Hornet SMG', dmg: 16, rate: 0.095, mag: 32, reserve: 256, range: 110, auto: true, price: SF.CONFIG.prices.smg},
    {name: 'Bulldog Scatter', dmg: 11, pellets: 6, rate: 0.9, mag: 6, reserve: 48, range: 45, price: SF.CONFIG.prices.shotgun},
    {name: 'Longshot Rifle', dmg: 92, rate: 1.1, mag: 5, reserve: 40, range: 240, price: SF.CONFIG.prices.rifle}
  ];
  var state = {
    defs: defs,
    owned: [true, false, false, false, false],
    ammo: defs.map(function (d) { return {mag: d.mag, reserve: d.reserve || 0}; }),
    cur: 0,
    timeToReady: 0,
    reloadT: 0,
    needsReload: false,
    equip: function (i) {
      if (!this.owned[i]) return false;
      if (i !== this.cur) { this.cur = i; this.reloadT = 0; this.needsReload = false; }
      return true;
    },
    reload: function () {
      var a = this.ammo[this.cur];
      if (!this.cur || this.reloadT > 0 || a.mag >= this.curDef().mag || !a.reserve) return false;
      this.reloadT = 1.1; this.needsReload = false;
      return true;
    },
    addAmmo: function (i, mags) {
      if (i < 1 || !defs[i] || !Number.isFinite(mags) || mags <= 0) return 0;
      var a = this.ammo[i], before = a.reserve;
      a.reserve = Math.max(before, Math.min(defs[i].reserve, before + Math.floor(defs[i].mag * mags)));
      return a.reserve - before;
    },
    unlock: function (i) {
      if (!defs[i]) return false;
      this.owned[i] = true; return true;
    },
    curDef: function () { return defs[this.cur]; },
    update: function (dt) {
      this.timeToReady = Math.max(0, this.timeToReady - dt);
      if (!this.reloadT) return;
      this.reloadT = Math.max(0, this.reloadT - dt);
      if (!this.reloadT) {
        var a = this.ammo[this.cur], rounds = Math.min(a.reserve, this.curDef().mag - a.mag);
        a.mag += rounds; a.reserve -= rounds; this.needsReload = false;
      }
    }
  };
  SF.weapons = state;
}());
