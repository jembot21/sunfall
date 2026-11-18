/**
 * Sunfall — Configuration & Architecture Constants
 *
 * Architecture:
 * - Plain classic JavaScript execution environment (no bundler/modules).
 * - All modules register on the global `window.SF` namespace.
 * - Loading order is strict as specified in `game/index.html`.
 * - Cross-module interfaces use lightweight state objects and functions.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  // Grid sizing: 8x8 city blocks bordered by roads and sidewalks.
  // Ocean lies to the west (negative X), beach borders the coast road.
  var BLOCK_SIZE = 72;
  var ROAD_WIDTH = 18;
  var SIDEWALK_WIDTH = 3.5;
  var BLOCKS_X = 8;
  var BLOCKS_Z = 8;
  var BEACH_WIDTH = 45;
  var OCEAN_WIDTH = 180;

  var TOTAL_GRID_WIDTH = (BLOCKS_X * BLOCK_SIZE) + ((BLOCKS_X + 1) * ROAD_WIDTH);
  var TOTAL_GRID_LENGTH = (BLOCKS_Z * BLOCK_SIZE) + ((BLOCKS_Z + 1) * ROAD_WIDTH);

  SF.CONFIG = {
    // City grid dimensions
    GRID: {
      BLOCK_SIZE: BLOCK_SIZE,
      ROAD_WIDTH: ROAD_WIDTH,
      SIDEWALK_WIDTH: SIDEWALK_WIDTH,
      BLOCKS_X: BLOCKS_X,
      BLOCKS_Z: BLOCKS_Z,
      BEACH_WIDTH: BEACH_WIDTH,
      OCEAN_WIDTH: OCEAN_WIDTH,
      TOTAL_WIDTH: TOTAL_GRID_WIDTH,
      TOTAL_LENGTH: TOTAL_GRID_LENGTH,
      // Grid bounds in world coordinates
      // City starts at X = 0 (coast road) and extends to +TOTAL_WIDTH
      MIN_X: -OCEAN_WIDTH - BEACH_WIDTH,
      MAX_X: TOTAL_GRID_WIDTH,
      MIN_Z: -TOTAL_GRID_LENGTH / 2,
      MAX_Z: TOTAL_GRID_LENGTH / 2,
      COAST_X: 0,
      BEACH_EDGE_X: -BEACH_WIDTH,
      OCEAN_EDGE_X: -OCEAN_WIDTH - BEACH_WIDTH
    },

    // Sunset visual palette
    COLORS: {
      SKY_TOP: 0x1f1430,
      SKY_HORIZON: 0xff7034,
      SUN: 0xff9a3c,
      SUN_GLOW: 0xffc15e,
      FOG: 0x361f38,
      AMBIENT_SKY: 0xffaf7a,
      AMBIENT_GROUND: 0x261d2b,
      ASPHALT: 0x242429,
      ROAD_LINE_WHITE: 0xeeeeee,
      ROAD_LINE_YELLOW: 0xf4a824,
      SIDEWALK: 0x6e6863,
      BEACH_SAND: 0xd6a964,
      OCEAN: 0x183652,
      OCEAN_FOAM: 0x6ebbdb,
      BUILDING_PALETTE: [
        0x36283b,
        0x48333e,
        0x2c263d,
        0x563842,
        0x232130,
        0x443038,
        0x3b334a,
        0x50393f
      ],
      WINDOW_LIT: 0xffdd77,
      WINDOW_DARK: 0x14141e,
      PALM_TRUNK: 0x544033,
      PALM_LEAF: 0x2f4c28,
      LAMP_POST: 0x2c2c34,
      LAMP_GLOW: 0xffe29a,
      ACCENT_HEX: '#ff9a3c'
    },

    // Core physics and movement rates
    PHYSICS: {
      FIXED_STEP: 1 / 60,
      GRAVITY: 26.0,
      PLAYER_WALK_SPEED: 6.5,
      PLAYER_RUN_SPEED: 12.0,
      PLAYER_ACCEL: 36.0,
      PLAYER_RADIUS: 0.5,
      PLAYER_HEIGHT: 1.8,
      VEHICLE_ACCEL: 32.0,
      VEHICLE_MAX_SPEED: 46.0,
      VEHICLE_REVERSE_SPEED: 14.0,
      VEHICLE_BRAKE: 52.0,
      VEHICLE_STEER_RATE: 2.8,
      VEHICLE_FRICTION: 1.2
    },

    // Police and Heat levels
    WANTED: {
      LIGHTBAR_BLINK_RATE: 2.2, // Full red/blue cycles per second
      THRESHOLDS: [0, 80, 240, 500, 900, 1500],
      DECAY_RATE_PER_SEC: 1.5,
      MAX_HEAT: 1600
    },

    // Story / Side missions
    MISSIONS: [
      {
        id: 'm1',
        title: 'Solano Arrival',
        desc: 'Meet Dario\'s contact at the South Pier.',
        reward: 500,
        targetPos: [0, 0, 120]
      },
      {
        id: 'm2',
        title: 'Sunset Courier',
        desc: 'Deliver the contraband across town before dusk.',
        reward: 1200,
        targetPos: [280, 0, -80]
      },
      {
        id: 'm3',
        title: 'Harbor Hustle',
        desc: 'Reclaim the impounded Torino from the Marina yard.',
        reward: 2500,
        targetPos: [60, 0, -220]
      },
      {
        id: 'm4',
        title: 'Downtown Highline',
        desc: 'Intercept the syndicate convoy in the financial district.',
        reward: 5000,
        targetPos: [420, 0, 40]
      }
    ],

    // Performance limits
    PERF: {
      MAX_PIXEL_RATIO: 1.5,
      MAX_DRAW_CALLS: 120,
      SHADOW_MAP_SIZE: 1024,
      SHADOW_CAMERA_SIZE: 45,
      FAR_PLANE: 550
    }
  };
})();
