/**
 * Sunfall — Mission Framework & Narrative Director
 *
 * Drives the story and open-world progression:
 * - Glowing gold 3D light beam marker & minimap target blip.
 * - Multi-stage missions: go-to, deliver, escape-with-heat, race-the-clock.
 * - Intro delivery + 5 narrative story missions.
 * - Endless repeatable side jobs (Solano Taxi Fares & Midnight Contraband Runs).
 * - Automatic HUD banners, payouts, and audio victory jingles.
 * - SF.missions namespace.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var markerGroup = new THREE.Group();
  markerGroup.name = 'mission_marker';

  // Gold vertical beam
  var beamGeom = new THREE.CylinderGeometry(1.6, 2.2, 32.0, 16, 1, true);
  var beamMat = new THREE.MeshBasicMaterial({
    color: 0xffb732,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var beam = new THREE.Mesh(beamGeom, beamMat);
  beam.position.y = 16.0;
  markerGroup.add(beam);

  // Pulsing ground ring
  var ringGeom = new THREE.RingGeometry(2.4, 3.2, 32);
  ringGeom.rotateX(-Math.PI / 2);
  var ringMat = new THREE.MeshBasicMaterial({
    color: 0xffd255,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  var ring = new THREE.Mesh(ringGeom, ringMat);
  ring.position.y = 0.15;
  markerGroup.add(ring);

  markerGroup.visible = false;
  if (SF.render && SF.render.scene) {
    SF.render.scene.add(markerGroup);
  }

  var markerPos = { x: 0, y: 0, z: 0 };
  var storyIndex = 0;
  var currentStage = 0;
  var storyDone = false;
  var activeMission = null;
  var stageTimer = 0;
  var animTimer = 0;

  var STORY_MISSIONS = [
    {
      title: 'Intro: Solano Welcome',
      desc: 'Meet Dario\'s contact and drive to Rico\'s garage.',
      reward: 150,
      unlocksPistol: true,
      stages: [
        {
          type: 'get_in_car',
          title: 'Borrowed Wheels',
          desc: 'Get into the orange Torino GT on Beach Boulevard.',
          target: { x: 6.5, z: 25.0 }
        },
        {
          type: 'goto',
          title: 'Rico\'s Garage',
          desc: 'Drive to Rico\'s Garage on 3rd Avenue.',
          target: { x: 180.0, z: 45.0 },
          dist: 9.0
        }
      ]
    },
    {
      title: 'Mission 1: The Courier',
      desc: 'Deliver high-value contraband before the deadline.',
      reward: 500,
      stages: [
        {
          type: 'goto',
          title: 'Pickup Contraband',
          desc: 'Collect the sealed case at North Marina Docks.',
          target: { x: 0.0, z: -270.0 },
          dist: 8.0
        },
        {
          type: 'timed_goto',
          title: 'South Pier Drop',
          desc: 'Deliver the case to South Pier before the timer expires!',
          target: { x: 0.0, z: 270.0 },
          dist: 9.0,
          timeLimit: 90.0
        }
      ]
    },
    {
      title: 'Mission 2: Heatwave',
      desc: 'Escape the corrupt police ambush.',
      reward: 800,
      stages: [
        {
          type: 'ambush',
          title: 'Syndicate Ambush',
          desc: 'The meet was a setup! Lose the 2-star police heat.',
          heat: 260
        },
        {
          type: 'lose_wanted',
          title: 'Evade Pursuit',
          desc: 'Break line-of-sight and lose your wanted stars.',
          target: null
        },
        {
          type: 'goto',
          title: 'Safe Return',
          desc: 'Return to the Solano Hideout.',
          target: { x: 14.0, z: 32.0 },
          dist: 7.0
        }
      ]
    },
    {
      title: 'Mission 3: Marina Heist',
      desc: 'Reclaim the impounded sports coupe from Marina yard.',
      reward: 1200,
      stages: [
        {
          type: 'goto',
          title: 'Marina Yard',
          desc: 'Reach the impound yard at North Marina.',
          target: { x: 90.0, z: -270.0 },
          dist: 8.0
        },
        {
          type: 'timed_goto',
          title: 'Deliver to Buyer',
          desc: 'Deliver the sports coupe to the Financial District buyer.',
          target: { x: 450.0, z: 90.0 },
          dist: 9.0,
          timeLimit: 85.0
        }
      ]
    },
    {
      title: 'Mission 4: Downtown Reckoning',
      desc: 'Ambush the syndicate courier and claim the payroll.',
      reward: 2000,
      stages: [
        {
          type: 'goto',
          title: 'Intercept Enforcer',
          desc: 'Intercept the syndicate convoy at Downtown Plaza.',
          target: { x: 360.0, z: 0.0 },
          dist: 8.0
        },
        {
          type: 'ambush',
          title: 'Heavy Heat',
          desc: 'Payroll secured! Police converge — lose the 3-star heat.',
          heat: 520
        },
        {
          type: 'lose_wanted',
          title: 'Shake the Cops',
          desc: 'Evade police pursuit.',
          target: null
        },
        {
          type: 'goto',
          title: 'Coastal Drop',
          desc: 'Deliver payroll to the Coastal Penthouse.',
          target: { x: 0.0, z: -180.0 },
          dist: 8.0
        }
      ]
    },
    {
      title: 'Mission 5: Sunset Kingpin',
      desc: 'Final showdown to take control of Solano Bay. Payout: $7,500.',
      reward: 7500,
      stages: [
        {
          type: 'goto',
          title: 'Tower Infiltration',
          desc: 'Infiltrate the Syndicate Headquarters tower.',
          target: { x: 450.0, z: -90.0 },
          dist: 8.0
        },
        {
          type: 'ambush',
          title: 'Maximum Manhunt',
          desc: 'Kingpin eliminated! Escape the 4-star citywide manhunt!',
          heat: 950
        },
        {
          type: 'timed_goto',
          title: 'Helipad Extraction',
          desc: 'Reach the Solano Bay Helipad for extraction!',
          target: { x: 0.0, z: 360.0 },
          dist: 10.0,
          timeLimit: 110.0
        }
      ]
    }
  ];

  function setMarker(pos) {
    if (!pos) {
      markerGroup.visible = false;
      markerPos.x = 0;
      markerPos.y = -999;
      markerPos.z = 0;
      return;
    }

    markerPos.x = pos.x;
    markerPos.y = (SF.world && SF.world.groundY ? SF.world.groundY(pos.x, pos.z) : 0);
    markerPos.z = pos.z;

    markerGroup.position.set(markerPos.x, markerPos.y, markerPos.z);
    markerGroup.visible = true;
  }

  function startStoryMission(index) {
    if (index >= STORY_MISSIONS.length) {
      storyDone = true;
      startSideJob();
      return;
    }

    storyIndex = index;
    currentStage = 0;
    activeMission = STORY_MISSIONS[index];
    setupStage(activeMission.stages[0]);

    if (SF.hud && SF.hud.showBanner) {
      SF.hud.showBanner(activeMission.title, activeMission.desc);
    }
  }

  function setupStage(stage) {
    if (!stage) return;

    if (stage.target) {
      setMarker(stage.target);
    } else {
      setMarker(null);
    }

    if (stage.type === 'timed_goto') {
      stageTimer = stage.timeLimit || 90.0;
    }

    if (stage.type === 'ambush' && stage.heat) {
      if (SF.police && SF.police.addHeat) {
        SF.police.addHeat(stage.heat);
      }
    }

    if (SF.hud && SF.hud.showBanner) {
      SF.hud.showBanner(stage.title, stage.desc);
    }
  }

  function completeMission() {
    if (!activeMission) return;

    var reward = activeMission.reward || 200;
    if (SF.player && SF.player.addCash) {
      SF.player.addCash(reward);
    }

    if (activeMission.unlocksPistol && SF.player) {
      SF.player.pistolUnlocked = true;
    }

    if (SF.audio && SF.audio.jingle) {
      SF.audio.jingle();
    }

    if (SF.hud && SF.hud.showBanner) {
      SF.hud.showBanner('Mission Completed!', 'Received $' + reward + (activeMission.unlocksPistol ? ' + 9mm Pistol Unlocked (Press Q)' : ''));
    }

    // Auto save story progress
    if (SF.save && SF.save.store) {
      SF.save.store();
    }

    activeMission = null;
    setMarker(null);

    // Queue next mission after brief pause
    setTimeout(function () {
      if (!storyDone) {
        startStoryMission(storyIndex + 1);
      } else {
        startSideJob();
      }
    }, 4000);
  }

  function failMission(reason) {
    if (SF.hud && SF.hud.showBanner) {
      SF.hud.showBanner('Mission Failed', reason || 'Objective was not met.');
    }

    setMarker(null);

    // Retry stage after short cooldown
    setTimeout(function () {
      if (activeMission) {
        currentStage = 0;
        setupStage(activeMission.stages[0]);
      }
    }, 3500);
  }

  // --- Repeatable Side Jobs Generator ---
  var sideJobCount = 0;
  function startSideJob() {
    sideJobCount++;
    var isTaxi = (sideJobCount % 2 === 1);

    var spots = [
      { name: 'Ocean Boulevard', x: 0, z: -180 },
      { name: 'Financial District', x: 450, z: 90 },
      { name: 'South Pier', x: 0, z: 270 },
      { name: 'Solano Marina', x: 90, z: -270 },
      { name: 'Central Palms', x: 270, z: 0 },
      { name: 'Sunfall Hotel', x: 180, z: -90 }
    ];

    var pickA = spots[Math.floor(Math.random() * spots.length)];
    var pickB = spots[Math.floor(Math.random() * spots.length)];
    while (pickB === pickA) {
      pickB = spots[Math.floor(Math.random() * spots.length)];
    }

    activeMission = {
      title: isTaxi ? 'Taxi Fare: ' + pickB.name : 'Package Drop: ' + pickB.name,
      desc: isTaxi ? 'Pick up passenger and drive to destination.' : 'Deliver contraband drop.',
      reward: isTaxi ? 140 : 250,
      stages: [
        {
          type: 'goto',
          title: isTaxi ? 'Passenger Pickup' : 'Pickup Package',
          desc: 'Head to ' + pickA.name + '.',
          target: { x: pickA.x, z: pickA.z },
          dist: 8.0
        },
        {
          type: 'timed_goto',
          title: isTaxi ? 'Fare Delivery' : 'Rushed Dropoff',
          desc: 'Deliver to ' + pickB.name + ' before time runs out!',
          target: { x: pickB.x, z: pickB.z },
          dist: 9.0,
          timeLimit: 75.0
        }
      ]
    };

    currentStage = 0;
    setupStage(activeMission.stages[0]);
  }

  function update(dt) {
    // Animate 3D marker
    if (markerGroup.visible) {
      animTimer += dt * 3.0;
      beam.rotation.y += 0.02;
      ring.scale.setScalar(1.0 + Math.sin(animTimer) * 0.15);
    }

    if (!activeMission) return;

    var stage = activeMission.stages[currentStage];
    if (!stage) return;

    var pPos = (SF.player && SF.player.pos) ? SF.player.pos : { x: 0, z: 0 };

    if (stage.type === 'get_in_car') {
      if (SF.player && SF.player.inCar) {
        advanceStage();
      }
    } else if (stage.type === 'goto') {
      var gdx = pPos.x - stage.target.x;
      var gdz = pPos.z - stage.target.z;
      if (Math.sqrt(gdx * gdx + gdz * gdz) < (stage.dist || 8.0)) {
        advanceStage();
      }
    } else if (stage.type === 'timed_goto') {
      stageTimer -= dt;
      if (stageTimer <= 0) {
        failMission('Time ran out!');
        return;
      }
      var tdx = pPos.x - stage.target.x;
      var tdz = pPos.z - stage.target.z;
      if (Math.sqrt(tdx * tdx + tdz * tdz) < (stage.dist || 9.0)) {
        advanceStage();
      }
    } else if (stage.type === 'ambush') {
      advanceStage();
    } else if (stage.type === 'lose_wanted') {
      if (SF.police && SF.police.wanted === 0) {
        advanceStage();
      }
    }
  }

  function advanceStage() {
    currentStage++;
    if (currentStage >= activeMission.stages.length) {
      completeMission();
    } else {
      setupStage(activeMission.stages[currentStage]);
    }
  }

  function start() {
    startStoryMission(storyIndex);
  }

  SF.missions = {
    start: start,
    enterFreeRoam: function () {
      storyDone = true;
      storyIndex = STORY_MISSIONS.length;
      activeMission = null;
      currentStage = 0;
      stageTimer = 0;
      setMarker(null);
      if (SF.hud) SF.hud.hideBanner();
    },
    update: update,
    get current() { return activeMission; },
    get storyIndex() { return storyIndex; },
    set storyIndex(idx) { storyIndex = idx; },
    get storyDone() { return storyDone; },
    set storyDone(done) { storyDone = !!done; },
    get markerPos() { return markerGroup.visible ? markerPos : null; },
    get stageTimer() { return stageTimer; },
    startStoryMission: startStoryMission,
    startSideJob: startSideJob
  };
})();
