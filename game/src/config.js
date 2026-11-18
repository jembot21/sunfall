// Shared global contracts for the classic-script game; every later module extends SF.
(function (root) {
  const SF = root.SF = root.SF || {};
  SF.CONFIG = {
    city: { blockSize: 92, roadWidth: 18, blocksAcross: 11, coastX: -540 },
    colors: { skyTop: 0x633e66, skyHorizon: 0xf49a60, sun: 0xffc16a, asphalt: 0x343438, sand: 0xc79464, ocean: 0x245d76, sidewalk: 0x878078, building: [0x8f665b, 0x6e6872, 0x9a806e, 0x575c67, 0xc08a66] },
    physics: { walkSpeed: 8, runSpeed: 13, acceleration: 22, gravity: 24, vehicleSpeed: 31, turnRate: 2.2 },
    wanted: { thresholds: [0, 1, 3, 6, 10, 15], decaySeconds: 18, lightbarBlinkRate: 15 },
    missions: { payouts: [450, 800, 1250, 2000] },
    perf: { pixelRatioMax: 1.5, maxDrawCalls: 250, maxBuildings: 420, maxPeds: 24, maxTraffic: 20 }
  };
})(window);
