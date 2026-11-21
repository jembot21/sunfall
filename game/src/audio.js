(function () {
  'use strict';
  const SF = window.SF = window.SF || {};
  let ctx, master, engine, engineGain, siren, sirenGain, noiseBuffer;
  let time = 0, stepAt = 0, gullAt = 4, noteAt = 0, note = 0;
  const melody = [48, 55, 60, 64, 55, 62, 59, 55, 45, 52, 57, 60, 52, 59, 55, 52];
  function oscillator(freq, type, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g); g.connect(master); o.start(); return [o, g];
  }
  function tone(freq, duration, volume = 0.08, type = 'sine', end = freq) {
    if (!ctx || ctx.state !== 'running') return;
    const [o, g] = oscillator(freq, type, 0.0001), now = ctx.currentTime;
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
    g.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    o.stop(now + duration + 0.02); o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  function noise(duration, volume, cutoff) {
    if (!ctx || ctx.state !== 'running') return;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = noiseBuffer; filter.type = 'lowpass'; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.connect(filter); filter.connect(gain); gain.connect(master);
    source.start(); source.stop(ctx.currentTime + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  SF.audio = {
    enabled: true, radio: true,
    unlock() {
      if (!this.enabled) return;
      try {
        if (!ctx) {
          const Audio = window.AudioContext || window.webkitAudioContext;
          if (!Audio) return;
          ctx = new Audio(); master = ctx.createGain(); master.gain.value = 0.52; master.connect(ctx.destination);
          noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
          [engine, engineGain] = oscillator(42, 'triangle', 0);
          [siren, sirenGain] = oscillator(620, 'sine', 0);
        }
        ctx.resume().catch(() => {});
      } catch (_) { this.enabled = false; }
    },
    gunshot() { noise(0.19, 0.42, 3400); tone(130, 0.14, 0.24, 'triangle', 32); },
    footstep() { noise(0.075, 0.065, 650); },
    mission() { [261.63, 329.63, 392, 523.25].forEach((f, i) => tone(f, 0.55 + i * 0.12, 0.065)); },
    sting() { this.mission(); },
    shot() { this.gunshot(); },
    update(dt) {
      if (!ctx) return;
      time += dt;
      const playing = SF.state?.mode === 'play', vehicle = SF.player?.vehicle || SF.player?.inVehicle;
      const speed = Math.abs(Number(vehicle?.speed ?? SF.player?.speed) || 0);
      const now = ctx.currentTime;
      master.gain.setTargetAtTime(this.enabled && playing ? 0.52 : 0, now, 0.08);
      engineGain.gain.setTargetAtTime(vehicle ? 0.055 : 0, now, 0.1);
      engine.frequency.setTargetAtTime(38 + Math.min(speed, 90) * 2.6, now, 0.12);
      const wanted = Number(SF.police?.stars ?? SF.police?.wanted ?? 0);
      sirenGain.gain.setTargetAtTime(wanted > 0 ? 0.025 : 0, now, 0.2);
      siren.frequency.setTargetAtTime(700 + Math.sin(time * 5) * 210, now, 0.03);
      if (!playing) return;
      if (!vehicle && (SF.input?.isDown('KeyW') || SF.input?.isDown('KeyS') || SF.input?.isDown('KeyA') || SF.input?.isDown('KeyD')) && time >= stepAt) {
        this.footstep(); stepAt = time + (SF.input.isDown('ShiftLeft') ? 0.28 : 0.43);
      }
      if (SF.input?.pressed('KeyR') && vehicle) this.radio = !this.radio;
      if (vehicle && this.radio && time >= noteAt) {
        const f = 440 * Math.pow(2, (melody[note++ % melody.length] - 69) / 12);
        tone(f, 0.7, 0.025, 'triangle'); tone(f * 2, 0.36, 0.012); noteAt = time + 0.32;
      }
      if (time >= gullAt) { tone(1180, 0.65, 0.012, 'sine', 1720); noise(1.5, 0.027, 360); gullAt = time + 6 + Math.random() * 7; }
    }
  };
  window.addEventListener('pointerdown', () => SF.audio.unlock());
  window.addEventListener('keydown', () => SF.audio.unlock());
})();
