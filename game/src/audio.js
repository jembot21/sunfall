(function (SF) {
  'use strict';
  let ctx, master, engine, engineGain, siren, sirenGain, mute = false;
  function init() {
    if (ctx) return;
    const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
    ctx = new Audio(); master = ctx.createGain(); master.gain.value = mute ? 0 : 0.18; master.connect(ctx.destination);
    engine = ctx.createOscillator(); engine.type = 'sawtooth'; engineGain = ctx.createGain(); engineGain.gain.value = 0.015; engine.connect(engineGain).connect(master); engine.start();
    siren = ctx.createOscillator(); siren.type = 'square'; sirenGain = ctx.createGain(); sirenGain.gain.value = 0; siren.connect(sirenGain).connect(master); siren.start();
  }
  function burst(freq, duration, volume, noise) {
    if (!ctx) return;
    const g = ctx.createGain(); g.gain.setValueAtTime(volume, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); g.connect(master);
    if (noise) { const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate), data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; const src = ctx.createBufferSource(); src.buffer = buffer; src.connect(g); src.start(); }
    else { const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(freq, ctx.currentTime); osc.connect(g); osc.start(); osc.stop(ctx.currentTime + duration); }
  }
  const audio = { init, mute(value) { mute = !!value; if (master) master.gain.setTargetAtTime(mute ? 0 : 0.18, ctx.currentTime, 0.04); },
    update() { if (!ctx) return; if (ctx.state === 'suspended') ctx.resume(); const speed = SF.player && SF.player.inCar ? Math.abs(SF.player.inCar.speed) : 0; engine.frequency.setTargetAtTime(45 + speed * 7, ctx.currentTime, 0.08); engineGain.gain.setTargetAtTime(speed ? 0.035 : 0.004, ctx.currentTime, 0.1); siren.frequency.setTargetAtTime(Math.sin(ctx.currentTime * 7) > 0 ? 680 : 890, ctx.currentTime, 0.03); sirenGain.gain.setTargetAtTime(SF.police && SF.police.wanted ? 0.012 : 0, ctx.currentTime, 0.1); },
    shot() { init(); burst(90, 0.2, 0.24, true); }, punch() { init(); burst(120, 0.12, 0.16, true); },
    jingle() { init(); [523, 659, 784].forEach((f, i) => setTimeout(() => burst(f, 0.22, 0.12, false), i * 100)); }
  };
  SF.audio = audio;
})(window.SF);
