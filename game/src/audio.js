/**
 * Sunfall — WebAudio Procedural Synthesizer
 *
 * 100% Assetless procedural audio engine:
 * - Dynamic car engine hum with RPM/speed pitch shifting and harmonic filtering.
 * - Modulated two-tone police siren active during wanted pursuits.
 * - Punch impacts (percussive pitch-dropped sine thump).
 * - Gunshot synthesis (filtered white-noise burst with rapid exponential decay).
 * - Mission complete victory jingle (four-note major chord arpeggio).
 * - Master mute control with persistent settings integration.
 * - SF.audio: { init(), update(dt), shot(), punch(), jingle(), setMuted(b), isMuted() }.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var audioCtx = null;
  var masterGain = null;
  var isMuted = false;
  var initialized = false;

  // Engine synth nodes
  var engineOsc = null;
  var engineGain = null;
  var engineFilter = null;

  // Siren synth nodes
  var sirenOsc = null;
  var sirenGain = null;
  var sirenTimer = 0;

  function init() {
    if (initialized) {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return;
    }

    try {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.45, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      // --- 1. Continuous Engine Synthesizer ---
      engineOsc = audioCtx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.setValueAtTime(45, audioCtx.currentTime);

      engineFilter = audioCtx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.setValueAtTime(180, audioCtx.currentTime);

      engineGain = audioCtx.createGain();
      engineGain.gain.setValueAtTime(0, audioCtx.currentTime);

      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(masterGain);
      engineOsc.start();

      // --- 2. Continuous Siren Synthesizer ---
      sirenOsc = audioCtx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.setValueAtTime(650, audioCtx.currentTime);

      sirenGain = audioCtx.createGain();
      sirenGain.gain.setValueAtTime(0, audioCtx.currentTime);

      sirenOsc.connect(sirenGain);
      sirenGain.connect(masterGain);
      sirenOsc.start();

      initialized = true;
    } catch (e) {
      // Audio not supported or blocked by browser policy
    }
  }

  function setMuted(muted) {
    isMuted = !!muted;
    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.45, audioCtx.currentTime);
    }
  }

  /**
   * Synthesizes a punch impact sound
   */
  function punch() {
    if (!audioCtx || isMuted) return;

    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();

    var t = audioCtx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.12);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  /**
   * Synthesizes a gunshot noise burst
   */
  function shot() {
    if (!audioCtx || isMuted) return;

    var bufferSize = audioCtx.sampleRate * 0.14;
    var noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var output = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    var whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    var filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, audioCtx.currentTime);
    filter.Q.setValueAtTime(2.5, audioCtx.currentTime);

    var gain = audioCtx.createGain();
    var t = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.13);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    whiteNoise.start(t);
  }

  /**
   * Synthesizes an upbeat 4-note victory jingle
   */
  function jingle() {
    if (!audioCtx || isMuted) return;

    var notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    var noteDuration = 0.11;
    var startTime = audioCtx.currentTime + 0.05;

    for (var i = 0; i < notes.length; i++) {
      var noteOsc = audioCtx.createOscillator();
      var noteGain = audioCtx.createGain();

      noteOsc.type = 'sine';
      noteOsc.frequency.setValueAtTime(notes[i], startTime + i * noteDuration);

      var nt = startTime + i * noteDuration;
      noteGain.gain.setValueAtTime(0.35, nt);
      noteGain.gain.exponentialRampToValueAtTime(0.005, nt + noteDuration * 0.95);

      noteOsc.connect(noteGain);
      noteGain.connect(masterGain);

      noteOsc.start(nt);
      noteOsc.stop(nt + noteDuration);
    }
  }

  function update(dt) {
    if (!initialized || !audioCtx) return;

    var player = SF.player;

    // --- Update Engine Hum ---
    if (engineOsc && engineGain && engineFilter) {
      if (player && player.inCar && player.currentCar) {
        var speedRatio = Math.min(1.0, Math.abs(player.currentCar.speed) / 45.0);
        var targetFreq = 42 + speedRatio * 135;
        var targetCutoff = 160 + speedRatio * 650;
        var targetVol = 0.14 + speedRatio * 0.22;

        engineOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.08);
        engineFilter.frequency.setTargetAtTime(targetCutoff, audioCtx.currentTime, 0.08);
        engineGain.gain.setTargetAtTime(isMuted ? 0 : targetVol, audioCtx.currentTime, 0.08);
      } else {
        engineGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.15);
      }
    }

    // --- Update Siren Wail ---
    if (sirenOsc && sirenGain) {
      var wanted = (SF.police && SF.police.wanted) || 0;
      if (wanted > 0) {
        sirenTimer += dt * 5.0;
        var sirenFreq = 620 + Math.sin(sirenTimer) * 260; // 360Hz - 880Hz wail
        sirenOsc.frequency.setValueAtTime(sirenFreq, audioCtx.currentTime);

        var sirenVol = Math.min(0.12, 0.04 + wanted * 0.016);
        sirenGain.gain.setTargetAtTime(isMuted ? 0 : sirenVol, audioCtx.currentTime, 0.1);
      } else {
        sirenGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
      }
    }
  }

  SF.audio = {
    init: init,
    update: update,
    shot: shot,
    punch: punch,
    jingle: jingle,
    setMuted: setMuted,
    isMuted: function () { return isMuted; }
  };
})();
