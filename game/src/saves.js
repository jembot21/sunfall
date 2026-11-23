import { STORY_MISSION_COUNT, WEAPONS } from './config.js';

export const SAVE_KEY = 'sunfall.save.v1';

export function readSave() {
  try {
    const value = JSON.parse(window.localStorage.getItem(SAVE_KEY));
    if (!value || value.version !== 1 || !Number.isFinite(value.cash) || !Array.isArray(value.ownedWeapons)) return null;
    const storyComplete = value.storyComplete === true;
    return {
      cash: Math.max(0, Math.floor(value.cash)),
      ownedWeapons: WEAPONS.filter((weapon) => weapon.id === 'fists' || value.ownedWeapons.includes(weapon.id)).map((weapon) => weapon.id),
      missionProgress: storyComplete ? STORY_MISSION_COUNT : Math.max(0, Math.min(STORY_MISSION_COUNT, Math.floor(Number(value.missionProgress) || 0))),
      storyComplete: storyComplete || value.missionProgress === STORY_MISSION_COUNT,
      selectedWeapon: value.selectedWeapon,
    };
  } catch { return null; }
}

export function writeSave(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, ...state }));
    return true;
  } catch { return false; }
}
