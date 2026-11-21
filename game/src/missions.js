(function (root) {
  'use strict';
  var SF = root.SF = root.SF || {};
  var districts = [
    { name: 'Palma Strand', x: -370, z: -230 }, { name: 'Old Harbor', x: 250, z: -330 },
    { name: 'Mirador Heights', x: 430, z: 180 }, { name: 'Cinder Flats', x: -180, z: 380 },
    { name: 'Glasspoint', x: 80, z: 80 }, { name: 'Mariner Row', x: -450, z: 150 }
  ];
  function mark(d, x, z, label) { return { x: x, y: 0, z: z, district: d, label: label }; }
  function objective(type, text, target, extra) { return Object.assign({ type: type, text: text, target: target }, extra || {}); }
  var story = [
    { title: 'First Favor', giver: 'Marco Reyes', district: 'Palma Strand', payout: 600, path: [mark('Palma Strand', -365, -225, 'Marco\'s garage'), mark('Palma Strand', -300, -130, 'Canal pickup'), mark('Old Harbor', 245, -310, 'Drop point')], stages: [objective('go', 'Meet Marco Reyes in Palma Strand', mark('Palma Strand', -365, -225, 'Marco')), objective('drive', 'Take Marco\'s sedan to the canal pickup', mark('Palma Strand', -300, -130, 'Sedan')), objective('deliver', 'Deliver the package at Old Harbor', mark('Old Harbor', 245, -310, 'Drop')), objective('escape', 'Lose the patrols and return to the coast', mark('Palma Strand', -365, -225, 'Safehouse'))] },
    { title: 'Quiet Wheels', giver: 'Marco Reyes', district: 'Palma Strand', payout: 850, path: [mark('Palma Strand', -330, -180, 'Garage'), mark('Cinder Flats', -180, 380, 'Workshop'), mark('Mariner Row', -430, 150, 'Buyer')], stages: [objective('go', 'Pick up the unmarked car', mark('Palma Strand', -330, -180, 'Garage')), objective('drive', 'Drive the car through Cinder Flats', mark('Cinder Flats', -180, 380, 'Workshop')), objective('deliver', 'Leave the car with the buyer', mark('Mariner Row', -430, 150, 'Buyer')), objective('escape', 'Shake the tail before heading back', mark('Palma Strand', -365, -225, 'Safehouse'))] },
    { title: 'Harbor Heat', giver: 'Nico Vale', district: 'Old Harbor', payout: 1100, path: [mark('Old Harbor', 245, -310, 'Pier'), mark('Glasspoint', 75, 80, 'Meet'), mark('Mariner Row', -430, 150, 'Slip')], stages: [objective('go', 'Meet Nico by the Old Harbor piers', mark('Old Harbor', 245, -310, 'Pier')), objective('drive', 'Drive the stolen coupe to Glasspoint', mark('Glasspoint', 75, 80, 'Meet')), objective('deliver', 'Hand off the harbor manifest', mark('Mariner Row', -430, 150, 'Slip')), objective('escape', 'Lose the harbor patrols', mark('Cinder Flats', -180, 380, 'Cut-through'))] },
    { title: 'High Ground', giver: 'Suri Calder', district: 'Mirador Heights', payout: 1450, path: [mark('Mirador Heights', 430, 180, 'Lookout'), mark('Old Harbor', 245, -310, 'Convoy'), mark('Palma Strand', -300, -130, 'Garage')], stages: [objective('go', 'Meet Suri at the Mirador lookout', mark('Mirador Heights', 430, 180, 'Lookout')), objective('drive', 'Shadow the convoy down to Old Harbor', mark('Old Harbor', 245, -310, 'Convoy')), objective('deliver', 'Deliver the recovered case in Palma Strand', mark('Palma Strand', -300, -130, 'Garage')), objective('escape', 'Break line of sight and cool the heat', mark('Mirador Heights', 430, 180, 'Hideout'))] },
    { title: 'A Clean Getaway', giver: 'Marco Reyes', district: 'Palma Strand', payout: 1800, path: [mark('Palma Strand', -365, -225, 'Garage'), mark('Cinder Flats', -180, 380, 'Airstrip'), mark('Glasspoint', 75, 80, 'Exchange')], stages: [objective('go', 'Get the route from Marco', mark('Palma Strand', -365, -225, 'Marco')), objective('drive', 'Drive the getaway car to Cinder Flats', mark('Cinder Flats', -180, 380, 'Airstrip')), objective('deliver', 'Deliver the keys at Glasspoint', mark('Glasspoint', 75, 80, 'Exchange')), objective('escape', 'Lose the response and reach the safehouse', mark('Palma Strand', -365, -225, 'Safehouse'))] },
    { title: 'The Long Tide', giver: 'Nico Vale', district: 'Mariner Row', payout: 2200, path: [mark('Mariner Row', -430, 150, 'Boatyard'), mark('Old Harbor', 245, -310, 'Warehouse'), mark('Mirador Heights', 430, 180, 'Villa')], stages: [objective('go', 'Meet Nico at the Mariner Row boatyard', mark('Mariner Row', -430, 150, 'Boatyard')), objective('drive', 'Reach the Old Harbor warehouse', mark('Old Harbor', 245, -310, 'Warehouse')), objective('deliver', 'Deliver the sealed crate in Mirador Heights', mark('Mirador Heights', 430, 180, 'Villa')), objective('escape', 'Outrun the search and disappear', mark('Cinder Flats', -180, 380, 'Hideout'))] },
    { title: 'No Loose Ends', giver: 'Suri Calder', district: 'Glasspoint', payout: 2700, path: [mark('Glasspoint', 75, 80, 'Cafe'), mark('Cinder Flats', -180, 380, 'Depot'), mark('Palma Strand', -300, -130, 'Drop')], stages: [objective('go', 'Meet Suri at the Glasspoint cafe', mark('Glasspoint', 75, 80, 'Cafe')), objective('drive', 'Drive to the Cinder Flats depot', mark('Cinder Flats', -180, 380, 'Depot')), objective('deliver', 'Deliver the final package in Palma Strand', mark('Palma Strand', -300, -130, 'Drop')), objective('escape', 'Lose the remaining patrols', mark('Mariner Row', -430, 150, 'Safe route'))] },
    { title: 'The Ledger', giver: 'Lena Voss', district: 'Old Harbor', payout: 5000, path: [mark('Old Harbor', 245, -310, 'Archive'), mark('Mirador Heights', 430, 180, 'Lena Voss'), mark('Palma Strand', -365, -225, 'Safehouse')], stages: [objective('go', 'Meet Lena Voss at the Old Harbor archive', mark('Old Harbor', 245, -310, 'Archive')), objective('drive', 'Drive Lena\'s ledger to Mirador Heights', mark('Mirador Heights', 430, 180, 'Lena Voss')), objective('deliver', 'Deliver the ledger and settle the crew\'s account', mark('Palma Strand', -365, -225, 'Safehouse')), objective('escape', 'Disappear for good and finish the story', mark('Palma Strand', -365, -225, 'Safehouse'))] }
  ];
  var activities = [
    { id: 'taxi', title: 'Taxi Fare', payout: 220, marker: mark('Palma Strand', -290, -95, 'Taxi passenger'), destination: mark('Glasspoint', 80, 100, 'Fare destination') },
    { id: 'race', title: 'Street Race', payout: 450, marker: mark('Mirador Heights', 415, 165, 'Starting grid'), destination: mark('Old Harbor', 265, -295, 'Finish line') },
    { id: 'courier', title: 'Courier Run', payout: 320, marker: mark('Cinder Flats', -165, 360, 'Courier pickup'), destination: mark('Mariner Row', -415, 130, 'Courier drop') },
    { id: 'stash', title: 'Stash Recovery', payout: 380, marker: mark('Old Harbor', 230, -285, 'Hidden stash'), destination: mark('Palma Strand', -340, -200, 'Contact') }
  ];
  var state = { active: null, storyDone: 0, cash: 250, activity: null, completed: false, revision: 0 };
  function playerPos() {
    var p = SF.player && (SF.player.position || SF.player.mesh && SF.player.mesh.position);
    return p || { x: 0, y: 0, z: 0 };
  }
  function distance(a, b) { var dx = (Number(a.x) || 0) - (Number(b.x) || 0), dz = (Number(a.z) || 0) - (Number(b.z) || 0); return Math.sqrt(dx * dx + dz * dz); }
  function setActive(entry, index, kind) {
    var stages = entry.stages || [objective('go', 'Go to the activity marker', entry.marker), objective('deliver', 'Complete the activity', entry.destination)];
    state.active = { id: entry.id || 'story-' + index, index: index, kind: kind || 'story', title: entry.title, giver: entry.giver || '', payout: entry.payout, stage: 0, stageElapsed: 0, stages: stages, path: entry.path || [entry.marker, entry.destination], currentObjective: stages[0].text, objectiveText: stages[0].text, nearestMarker: stages[0].target, completed: false, elapsed: 0, escapeDistance: 0 };
    state.activity = kind === 'activity' ? entry : null; state.completed = false; state.revision++;
    if (SF.hud && SF.hud.acceptMission) SF.hud.acceptMission(entry.title, stages[0].text);
    return state.active;
  }
  function begin(index) {
    index = index == null ? state.storyDone : Math.max(0, Math.floor(index));
    if (index >= story.length) { state.active = null; state.completed = true; return null; }
    state.storyDone = Math.min(index, story.length); state.cash = Math.max(0, Number(state.cash) || 0);
    return setActive(story[index], index, 'story');
  }
  function finish() {
    var a = state.active; if (!a || a.completed) return false;
    a.completed = true; state.cash += Number(a.payout) || 0;
    if (a.kind === 'story') state.storyDone = Math.max(state.storyDone, a.index + 1);
    state.active = null; state.activity = null; state.completed = true; state.revision++;
    if (SF.save) SF.save.store({ cash: state.cash, storyDone: state.storyDone });
    if (SF.hud && SF.hud.showComplete) SF.hud.showComplete(a.title, a.payout);
    if (SF.audio && SF.audio.missionSting) SF.audio.missionSting();
    return true;
  }
  function updateObjective() {
    var a = state.active; if (!a) return;
    var o = a.stages[a.stage];
    if (!o) { finish(); return; }
    a.currentObjective = a.objectiveText = o.text; a.nearestMarker = o.target;
  }
  function advance() {
    var a = state.active; if (!a) return false;
    a.stage++; a.stageElapsed = 0;
    if (a.stage >= a.stages.length) return finish();
    updateObjective(); state.revision++;
    if (SF.hud && SF.hud.setObjective) SF.hud.setObjective(a.title, a.objectiveText);
    return true;
  }
  function wantedLevel() {
    var p = SF.police || {};
    var w = p.wanted || p.wantedState || {};
    return Number(typeof w === 'number' ? w : (w.level != null ? w.level : (w.stars != null ? w.stars : (p.wantedLevel != null ? p.wantedLevel : p.level)))) || 0;
  }
  function escapeSatisfied(input) {
    input = input || {};
    var wanted = Number(input.wanted != null ? input.wanted : wantedLevel()) || 0;
    var elapsed = Number(input.elapsed) || 0, dist = Number(input.distance) || 0;
    return wanted <= 0 && elapsed >= 2 && dist >= 60;
  }
  function interact(input) {
    var a = state.active; if (!a) return false;
    var o = a.stages[a.stage], pos = playerPos(); if (!o) return finish();
    var near = distance(pos, o.target) <= (o.radius || 28);
    if (o.type === 'escape') {
      var atSafePoint = distance(pos, o.target) <= (o.radius || 28);
      var result = atSafePoint && escapeSatisfied({ wanted: input && input.wanted, elapsed: input && input.elapsed != null ? input.elapsed : a.stageElapsed, distance: input && input.distance != null ? input.distance : Infinity });
      if (result) return advance();
      return false;
    }
    if (!near && !(input && input.force)) return false;
    if (o.type === 'drive') {
      var player = SF.player || {};
      if (!(input && input.force) && !(player.car || player.inVehicle || player.vehicle || player.currentVehicle || (SF.vehicles && SF.vehicles.current))) return false;
    }
    return advance();
  }
  function startActivity(id) {
    var entry = typeof id === 'string' ? activities.filter(function (a) { return a.id === id; })[0] : id;
    return entry ? setActive(entry, -1, 'activity') : null;
  }
  function update(dt) {
    if (!state.active) return;
    var a = state.active; var step = Math.max(0, Math.min(0.1, Number(dt) || 0)); a.elapsed += step; a.stageElapsed += step;
    var pos = playerPos(); a.escapeDistance = distance(pos, a.nearestMarker || pos);
    updateObjective();
  }
  function stageCapture(name) {
    var idx = name === 'chase' ? 2 : name === 'drive' ? 1 : name === 'mission' ? Math.min(state.storyDone, 7) : 0;
    begin(idx); if (name === 'chase' && state.active) state.active.stage = 3;
    updateObjective();
  }
  SF.missions = {
    districts: districts,
    story: story,
    activities: activities,
    state: state,
    get active() { return state.active; },
    get storyDone() { return state.storyDone; },
    get cash() { return state.cash; },
    begin: begin,
    accept: begin,
    advance: advance,
    interact: interact,
    startActivity: startActivity,
    update: update,
    finish: finish,
    isPatrolEscaped: escapeSatisfied,
    escapeSatisfied: escapeSatisfied,
    stageCapture: stageCapture,
    getCampaignPaths: function () { return story.map(function (m) { return m.path.slice(); }); },
    restore: function (saved) { saved = saved || {}; state.cash = Number(saved.cash) || 250; state.storyDone = Math.max(0, Math.min(8, Number(saved.storyDone) || 0)); return state; }
  };
  var loaded = SF.save && SF.save.data; if (loaded) SF.missions.restore(loaded);
})(globalThis);
