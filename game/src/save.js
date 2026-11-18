/**
 * Sunfall — Persistence & Game State Save Subsystem
 *
 * Persists player progression to browser localStorage:
 * - Cash reserves, story mission milestone index, and narrative completion.
 * - Weapon unlock states (9mm pistol).
 * - Player settings (audio master mute).
 * - Safe error handling against disabled storage or private browsing mode.
 * - SF.save: { data, load(), store(), reset() }.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var STORAGE_KEY = 'sunfall_save_v1';
  var SAVE_VERSION = 1;

  var defaultData = {
    version: SAVE_VERSION,
    cash: 80,
    storyIndex: 0,
    storyDone: false,
    pistolUnlocked: false,
    settings: {
      muted: false
    }
  };

  var currentData = JSON.parse(JSON.stringify(defaultData));

  function load() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return currentData;
      }

      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.version === SAVE_VERSION) {
          currentData.cash = (typeof parsed.cash === 'number') ? parsed.cash : defaultData.cash;
          currentData.storyIndex = (typeof parsed.storyIndex === 'number') ? parsed.storyIndex : defaultData.storyIndex;
          currentData.storyDone = !!parsed.storyDone;
          currentData.pistolUnlocked = !!parsed.pistolUnlocked;
          if (parsed.settings) {
            currentData.settings.muted = !!parsed.settings.muted;
          }

          // Apply loaded data to active runtime modules
          if (SF.player) {
            SF.player.cash = currentData.cash;
            SF.player.pistolUnlocked = currentData.pistolUnlocked;
          }

          if (SF.missions) {
            SF.missions.storyIndex = currentData.storyIndex;
            SF.missions.storyDone = currentData.storyDone;
          }

          if (SF.audio && SF.audio.setMuted) {
            SF.audio.setMuted(currentData.settings.muted);
          }
        }
      }
    } catch (e) {
      // Storage unavailable or blocked
    }
    return currentData;
  }

  function store() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }

      // Collect live state
      if (SF.player) {
        currentData.cash = SF.player.cash;
        currentData.pistolUnlocked = SF.player.pistolUnlocked;
      }

      if (SF.missions) {
        currentData.storyIndex = SF.missions.storyIndex;
        currentData.storyDone = SF.missions.storyDone;
      }

      if (SF.audio && SF.audio.isMuted) {
        currentData.settings.muted = SF.audio.isMuted();
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));
      return true;
    } catch (e) {
      return false;
    }
  }

  function reset() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      currentData = JSON.parse(JSON.stringify(defaultData));

      if (SF.player) {
        SF.player.cash = defaultData.cash;
        SF.player.pistolUnlocked = defaultData.pistolUnlocked;
      }

      if (SF.missions) {
        SF.missions.storyIndex = defaultData.storyIndex;
        SF.missions.storyDone = defaultData.storyDone;
      }
    } catch (e) {
      // Storage unavailable
    }
  }

  SF.save = {
    get data() { return currentData; },
    load: load,
    store: store,
    reset: reset
  };
})();
