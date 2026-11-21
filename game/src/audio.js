(function (root) {
  'use strict';
  var SF = root.SF = root.SF || {};
  var ctx = null, master = null, ambience = null, siren = null, engine = null;
  function ensure() {
    if (ctx) return ctx;
    var C = root.AudioContext || root.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); master = ctx.createGain(); master.gain.value = 0.42; master.connect(ctx.destination); } catch (_) { ctx = null; }
    return ctx;
  }
  function tone(freq, duration, wave, volume, endFreq) {
    var c = ensure(); if (!c) return;
    try {
      var osc = c.createOscillator(), gain = c.createGain(), now = c.currentTime;
      osc.type = wave || 'sine'; osc.frequency.setValueAtTime(freq, now);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
      gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume || 0.1), now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain); gain.connect(master); osc.start(now); osc.stop(now + duration + 0.03);
    } catch (_) { /* Audio is optional on unsupported devices. */ }
  }
  function noise(seconds, cutoff, volume, repeat) {
    var c = ensure(); if (!c) return null;
    try {
      var length = Math.max(1, Math.floor(c.sampleRate * seconds)), buffer = c.createBuffer(1, length, c.sampleRate), data = buffer.getChannelData(0);
      for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      var src = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
      src.buffer = buffer; src.loop = !!repeat; filter.type = 'lowpass'; filter.frequency.value = cutoff || 900;
      gain.gain.value = volume || 0.04; src.connect(filter); filter.connect(gain); gain.connect(master); src.start();
      return { source: src, gain: gain, filter: filter };
    } catch (_) { return null; }
  }
  function stop(loop) {
    if (!loop) return;
    try { loop.source.stop(); } catch (_) {}
    try { loop.gain.disconnect(); } catch (_) {}
  }
  SF.audio = {
    context: function () { return ensure(); },
    resume: function () { var c = ensure(); if (c && c.state === 'suspended') c.resume(); },
    engineHum: function (speed) {
      var c = ensure(); if (!c) return;
      if (!engine) {
        try { var o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 58; g.gain.value = 0.0001; o.connect(g); g.connect(master); o.start(); engine = { osc: o, gain: g }; } catch (_) { return; }
      }
      var s = Math.max(0, Number(speed) || 0);
      engine.osc.frequency.setTargetAtTime(48 + Math.min(170, s * 5.5), c.currentTime, 0.12);
      engine.gain.gain.setTargetAtTime(s > 0.1 ? 0.035 + Math.min(0.06, s * 0.001) : 0.0001, c.currentTime, 0.2);
    },
    stopEngine: function () { if (engine && ctx) engine.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12); },
    footsteps: function (pace) { tone(95 + (pace || 0) * 4, 0.12, 'triangle', 0.08, 38); noise(0.09, 450, 0.045, false); },
    gunshot: function () { tone(105, 0.22, 'sawtooth', 0.23, 26); noise(0.18, 1500, 0.19, false); },
    sirenLoop: function (enabled) {
      var c = ensure(); if (!c) return;
      if (!enabled) { stop(siren); siren = null; return; }
      if (siren) return;
      try { var o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); o.type = 'square'; o.frequency.value = 650; lfo.frequency.value = 0.7; lg.gain.value = 370; lfo.connect(lg); lg.connect(o.frequency); g.gain.value = 0.045; o.connect(g); g.connect(master); o.start(); lfo.start(); siren = { source: o, gain: g, lfo: lfo }; } catch (_) {}
    },
    missionSting: function () { tone(392, 0.22, 'triangle', 0.09); setTimeout(function () { tone(523.25, 0.36, 'triangle', 0.12); }, 180); setTimeout(function () { tone(659.25, 0.48, 'sine', 0.12); }, 340); },
    startAmbience: function () {
      if (ambience) return;
      var waves = noise(2.4, 520, 0.018, true);
      var gull = noise(1.1, 2800, 0.004, true);
      ambience = { waves: waves, gull: gull };
      if (gull && ctx) {
        var c = ctx;
        (function callGull() { if (!ambience) return; var t = c.currentTime; try { gull.gain.gain.setValueAtTime(0.001, t); gull.gain.gain.linearRampToValueAtTime(0.009, t + 0.7); gull.gain.gain.linearRampToValueAtTime(0.001, t + 1.4); } catch (_) {} setTimeout(callGull, 6200 + Math.random() * 4800); })();
      }
    },
    stopAmbience: function () { if (!ambience) return; stop(ambience.waves); stop(ambience.gull); ambience = null; },
    update: function (dt) { void dt; }
  };
})(globalThis);
