(() => {
  const SF = globalThis.SF ||= {};
  let ctx, bus, engine, siren, noise, nextBeat = 0, beat = 0, nextSurf = 0, stepAt = 0;
  const melody = [48, 55, 60, 64, 45, 52, 57, 60, 41, 48, 53, 57, 43, 50, 55, 59];
  const hz = midi => 440 * 2 ** ((midi - 69) / 12);
  function loop(type, frequency) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = 0;
    osc.connect(gain).connect(bus);
    osc.start();
    return { osc, gain };
  }
  function tone(type, from, to, length, volume, delay = 0) {
    if (ctx?.state !== 'running') return;
    const time = ctx.currentTime + delay;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, time);
    osc.frequency.exponentialRampToValueAtTime(to, time + length);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + Math.min(0.03, length / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    osc.connect(gain).connect(bus);
    osc.start(time);
    osc.stop(time + length);
  }
  function wash(length, frequency, volume, filterType = 'lowpass') {
    if (ctx?.state !== 'running') return;
    const at = ctx.currentTime;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = noise;
    filter.type = filterType;
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + Math.min(length / 3, 0.025));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    source.connect(filter).connect(gain).connect(bus);
    source.start(at, 0, length);
  }
  SF.audio = {
    station: 'SOLANO FM', radio: true,
    unlock() {
      if (!ctx) {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) return;
        ctx = new Audio();
        bus = ctx.createGain();
        bus.gain.value = 0.48;
        bus.connect(ctx.destination);
        engine = loop('triangle', 44);
        siren = loop('sine', 620);
        noise = ctx.createBuffer(1, 2 * ctx.sampleRate, ctx.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      ctx.resume().catch(() => {});
    },
    footstep() {
      if (!ctx || ctx.currentTime < stepAt) return;
      stepAt = ctx.currentTime + 0.22;
      wash(0.12, 630, 0.13);
    },
    gunshot() {
      wash(0.21, 1500, 0.42, 'bandpass');
      tone('triangle', 120, 45, 0.16, 0.28);
    },
    mission() {
      [60, 64, 67, 72].forEach((note, offset) => tone('triangle', hz(note), hz(note), 0.4, 0.09, offset * 0.09));
    },
    update({ playing = false, driving = false, walking = false, speed = 0, wanted = 0 } = {}) {
      if (ctx?.state !== 'running') return;
      const now = ctx.currentTime;
      engine.osc.frequency.setTargetAtTime(40 + Math.min(Math.abs(speed), 75) * 2, now, 0.1);
      engine.gain.gain.setTargetAtTime(playing && driving ? 0.12 : 0, now, 0.08);
      siren.osc.frequency.setTargetAtTime(670 + 180 * Math.sin(now * 4), now, 0.04);
      siren.gain.gain.setTargetAtTime(playing && wanted ? 0.035 : 0, now, 0.11);
      if (!playing) return;
      if (walking && !driving) this.footstep();
      if (now >= nextSurf) {
        nextSurf = now + 7 + Math.random() * 5;
        wash(1.8, 340, 0.06);
        tone('sine', 1050, 670, 0.37, 0.025, 0.4);
        tone('sine', 980, 590, 0.3, 0.02, 0.87);
      }
      if (driving && this.radio && now >= nextBeat) {
        nextBeat = now + 0.29;
        const note = melody[beat++ % melody.length];
        tone('triangle', hz(note), hz(note), 0.48, 0.055);
        if (beat % 4 === 1) tone('sine', hz(note - 12), hz(note - 12), 0.95, 0.065);
      }
    }
  };
})();
