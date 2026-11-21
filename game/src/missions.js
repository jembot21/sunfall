(function () {
  'use strict';
  const SF = window.SF = window.SF || {};
  // Logical route stops resolve to curbside positions on the 96 m street grid.
  // In particular, the first stop is the crew marker beside Palma Apartment.
  const routeX = { '-180': -499, '-160': -499, '-100': -403, '-40': -211, '40': -115, '100': 77, '160': 365 };
  const routeZ = { '-160': -203.5, '-100': -299.5, '-40': -11.5, '40': -299.5, '100': 180.5, '160': 276.5, '180': 372.5 };
  const point = (x, z) => ({ x: routeX[x] ?? x, y: 0.24, z: routeZ[z] ?? z });
  const stage = (kind, text, x, z, line) => ({ kind, text, position: point(x, z), line });
  const story = [
    { title: 'First Favor', contact: 'Marco Reyes', district: 'Palma Strand', payout: 450, start: point(-160, 160), intro: 'Welcome to Palma Strand. Do one quiet favor for me and the bay will start opening doors.', stages: [
      stage('go', 'Meet Marco at the Palma Strand promenade', -160, 160, 'I am by the promenade. Come over on foot; I want to see who I am trusting.'),
      stage('drive', 'Bring a car to the beach loading bay', -100, 180, 'Find yourself a ride and pull into the beach loading bay. The package is small; the favor is not.'),
      stage('deliver', 'Deliver Marco’s package to the corner café', -40, 100, 'Take it to the café inland. Keep the wheels straight and the package out of the water.') ] },
    { title: 'Vale Parking', contact: 'Nico Vale', payout: 650, start: point(-40, 100), intro: 'Marco says you can drive. Bring a car over and let us see if he was being generous.', stages: [
      stage('go', 'Meet Nico behind the café', -40, 100, 'The café has a back door. That is where the useful conversations happen.'),
      stage('drive', 'Drive to Nico’s garage', 100, 100, 'Garage is across town. Bring the car in one piece; I have enough spare parts already.'),
      stage('deliver', 'Drop the keys at the seafront lot', 160, 40, 'Leave the car at the seafront lot. Our buyer likes a view with his questionable decisions.') ] },
    { title: 'Signal to Noise', contact: 'Suri Calder', payout: 850, start: point(160, 40), intro: 'Nico gave me your number. I need a courier who can follow a signal without making one.', stages: [
      stage('go', 'Collect Suri’s transmitter at the seafront', 160, 40, 'The transmitter is waiting at the lot. No switches, no experiments, just pick it up.'),
      stage('drive', 'Drive the transmitter to the relay yard', 160, -100, 'The relay yard has a clean line across the bay. Get the transmitter there before anyone traces it.'),
      stage('deliver', 'Deliver the signal recorder downtown', 40, -160, 'We have the recording. Bring it downtown and I will make sure it disappears properly.') ] },
    { title: 'Night Freight', contact: 'Marco Reyes', payout: 1100, start: point(-160, 160), intro: 'A shipment at the docks belongs to friends. Tonight we are correcting the paperwork.', stages: [
      stage('go', 'Meet Marco on the promenade', -160, 160, 'Same spot at Palma Strand. Some arrangements are worth keeping simple.'),
      stage('drive', 'Take a vehicle to the dock gates', -160, -100, 'Drive to the dock gates. The night crew knows our faces, but not our plates.'),
      stage('deliver', 'Move the freight to Nico’s garage', 100, 100, 'Nico has made room in the garage. Bring our freight home and do not stop for company.'),
      stage('escape', 'Lose any wanted level and reach the quiet lot', 40, 160, 'Check your mirrors. Only come to the quiet lot once the police have lost interest.') ] },
    { title: 'Open Circuit', contact: 'Suri Calder', payout: 1400, start: point(40, -160), intro: 'The recording names a private security route. Let us give their accountant a very confusing evening.', stages: [
      stage('go', 'Meet Suri at the downtown relay', 40, -160, 'I am at the relay. There is a sealed drive here with your name very deliberately absent.'),
      stage('drive', 'Carry the drive across the bay road', -100, -160, 'Stay on the bay road. We need distance from the relay before this drive comes online.'),
      stage('deliver', 'Deliver the drive to the waterfront contact', -180, 40, 'Waterfront contact is ready. Hand over the drive and let somebody else worry about the passwords.') ] },
    { title: 'Borrowed Time', contact: 'Nico Vale', payout: 1800, start: point(100, 100), intro: 'Someone wants our garage shut down. Help me move the important things before they find the door.', stages: [
      stage('go', 'Collect Nico’s records from the garage', 100, 100, 'The records are packed. Funny how a life’s work fits in a bag when it has to.'),
      stage('drive', 'Drive Nico’s records to Palma Strand', -100, 180, 'Head for Palma Strand. Marco has a room where the lights do not ask questions.'),
      stage('escape', 'Reach the safe lot with no wanted stars', -160, 160, 'Do another block if you have a tail. I need those records safe more than I need them fast.') ] },
    { title: 'Voss Conditions', contact: 'Lena Voss', payout: 2200, start: point(160, -100), intro: 'Your friends have pieces of a larger account. Meet me and we can decide what the whole truth is worth.', stages: [
      stage('go', 'Meet Lena at the relay yard', 160, -100, 'Come to the relay yard. Suri says you know the way, and Nico says you know when to leave.'),
      stage('drive', 'Drive to the downtown exchange', 40, -160, 'Take a car to the downtown exchange. We are buying a ledger with evidence, not money.'),
      stage('deliver', 'Bring the exchange packet to Lena’s contact', -180, 40, 'Our contact is on the waterfront. Give them the packet and keep the receipt; that part matters.') ] },
    { title: 'The Last Ledger', contact: 'Lena Voss', payout: 3500, start: point(-180, 40), intro: 'This is the ledger they buried the bay under. One last run and every name gets daylight.', stages: [
      stage('go', 'Collect Lena’s ledger on the waterfront', -180, 40, 'The ledger is here. Once you take it, there is no bargaining it back to them.'),
      stage('drive', 'Drive the ledger to Suri’s relay', 160, -100, 'Suri is ready to publish. Get the ledger to her relay and we can finally stop whispering.'),
      stage('deliver', 'Deliver the ledger to the broadcast drop', 40, -160, 'The broadcast drop is downtown. Put it in their hands; let the whole city read along.'),
      stage('escape', 'Return to Palma Strand with no wanted stars', -160, 160, 'It is out. Lose any tail and go back to Palma Strand; your crew is waiting in the sun.') ] }
  ];
  const activities = [
    { id: 'taxi', title: 'Bay Taxi', kind: 'taxi', start: point(-100, 100), finish: point(100, -100), payout: 220, limit: 100, text: 'Collect a fare, then drive them across the bay', contact: 'Dispatch', line: 'Fare waiting at the curb. Smooth driving earns repeat business.' },
    { id: 'courier', title: 'Express Courier', kind: 'courier', start: point(100, 160), finish: point(-160, -100), payout: 300, limit: 90, text: 'Collect the parcel and deliver before the clock runs out', contact: 'Suri Calder', line: 'One parcel, one address. The clock is real, so save the sightseeing for later.' },
    { id: 'race', title: 'Bay Circuit', kind: 'race', start: point(160, 100), finish: point(160, 100), checkpoints: [point(160, -160), point(-160, -160), point(-160, 100), point(160, 100)], payout: 500, limit: 140, text: 'Drive the four-checkpoint bay circuit', contact: 'Nico Vale', line: 'Four corners of the bay, against the clock. Keep it clean and the pot is yours.' },
    { id: 'stash', title: 'Hidden Stash', kind: 'stash', start: point(-100, -40), finish: point(-100, -40), payout: 160, limit: 0, text: 'Find the stash behind the waterfront blocks', contact: 'Marco Reyes', line: 'There is an envelope behind the waterfront blocks. Finders get paid; talkers do not.' }
  ];
  let scene, marker, ring, cooldowns = {}, autoTimer = 0;
  function position() { return SF.player?.vehicle?.mesh?.position || SF.player?.mesh?.position || SF.player?.position || { x: 0, y: 0, z: 0 }; }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  function driving() { return !!(SF.player?.vehicle || SF.player?.inVehicle || SF.player?.car); }
  function stars() { const p = SF.police; return Number(p?.stars ?? p?.wanted?.stars ?? p?.wanted ?? 0) || 0; }
  function phone(m, line) { SF.phone?.call(m.contact, line); }
  function pay(amount) { SF.player.cash = (Number(SF.player.cash) || 0) + amount; SF.audio?.mission?.(); }
  SF.missions = {
    story, missions: story, activities, active: null, storyDone: 0, objective: '', nearestMarker: null,
    init(target) {
      scene = target?.scene || target || SF.world?.scene || SF.scene;
      if (marker || !scene?.add || !window.THREE) return;
      marker = new THREE.Group(); marker.name = 'Mission marker';
      ring = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.18, 6, 36), new THREE.MeshBasicMaterial({ color: 0xffc66a, transparent: true, opacity: 0.8 }));
      ring.rotation.x = -Math.PI / 2; marker.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 14, 8), new THREE.MeshBasicMaterial({ color: 0xffc66a, transparent: true, opacity: 0.35, depthWrite: false }));
      beam.position.y = 7; marker.add(beam); scene.add(marker); this.refresh();
    },
    refresh() {
      const a = this.active;
      if (a) {
        const s = a.activity ? a.stages[a.stage] : a.mission.stages[a.stage];
        a.objective = s.text; a.currentObjective = s.text; a.marker = s.position;
        this.objective = s.text; this.nearestMarker = { ...s.position, title: a.title, kind: s.kind };
      } else {
        const m = story[this.storyDone];
        const options = activities.filter(x => !cooldowns[x.id]).map(x => ({ ...x.start, title: x.title, kind: x.kind, activity: x }));
        if (m) options.push({ ...m.start, title: m.title, kind: 'story', mission: m });
        options.sort((a, b) => distance(position(), a) - distance(position(), b));
        this.nearestMarker = options[0] || null;
        this.objective = m ? 'Meet ' + m.contact + ' · ' + m.title : 'Story complete · Explore the bay or take a side job';
      }
      if (marker) {
        marker.visible = !!this.nearestMarker;
        if (this.nearestMarker) marker.position.set(this.nearestMarker.x, 0.35, this.nearestMarker.z);
      }
    },
    start(index = this.storyDone) {
      if (this.active || index !== this.storyDone || !story[index]) return false;
      const m = story[index]; this.active = { mission: m, title: m.title, contact: m.contact, stage: 0, elapsed: 0, activity: false };
      phone(m, m.intro); phone(m, m.stages[0].line); this.refresh(); return true;
    },
    startActivity(id) {
      const a = activities.find(x => x.id === id);
      if (this.active || !a || cooldowns[id]) return false;
      const stages = a.kind === 'race'
        ? a.checkpoints.map((p, i) => ({ kind: 'drive', text: 'Bay Circuit · checkpoint ' + (i + 1) + '/4', position: p, line: i === 3 ? 'Last checkpoint. Bring it home.' : 'Clean corner. Next marker is up.' }))
        : [{ kind: a.kind === 'stash' ? 'go' : 'drive', text: a.text, position: a.finish, line: 'Keep moving; the drop is marked.' }];
      this.active = { mission: a, title: a.title, contact: a.contact, stage: 0, elapsed: 0, activity: true, stages, remaining: a.limit };
      phone(a, a.line); this.refresh(); return true;
    },
    advance() {
      const a = this.active; if (!a) return;
      const stages = a.activity ? a.stages : a.mission.stages;
      a.stage++; a.elapsed = 0;
      if (a.stage >= stages.length) {
        pay(a.mission.payout);
        phone(a.mission, a.activity ? 'Job done. Your payment is through; there will be more work when you want it.' : a.title === 'The Last Ledger' ? 'The ledger is public, and the crew is safe. The bay owes you a sunrise.' : 'That is the job settled. Your share is through; keep your phone close.');
        if (a.activity) cooldowns[a.mission.id] = 45;
        else {
          this.storyDone++;
          const unlock = this.storyDone === 1 ? 'pistol' : this.storyDone === 5 ? 'carbine' : null;
          if (unlock) { SF.weapons?.unlock(unlock); if (SF.save && !SF.save.unlocks.includes(unlock)) SF.save.unlocks.push(unlock); }
          if (this.storyDone === 8 && SF.save && !SF.save.unlocks.includes('crew-finale')) SF.save.unlocks.push('crew-finale');
        }
        this.active = null; SF.save?.store();
      } else phone(a.mission, stages[a.stage].line);
      this.refresh();
    },
    reset() { this.active = null; this.storyDone = 0; cooldowns = {}; autoTimer = 0; this.refresh(); },
    update(dt) {
      for (const k of Object.keys(cooldowns)) { cooldowns[k] -= dt; if (cooldowns[k] <= 0) delete cooldowns[k]; }
      this.refresh();
      if (ring) ring.rotation.z += dt * 0.5;
      const a = this.active, p = position();
      if (!a) {
        const m = story[this.storyDone];
        // The first conversation starts naturally when the player reaches Marco.
        if (m && distance(p, m.start) < 9) {
          autoTimer += dt;
          if (autoTimer > 1) { this.start(); autoTimer = 0; }
        } else autoTimer = 0;
        if (SF.input?.pressed('KeyM')) this.start();
        if (SF.input?.pressed('KeyG') && this.nearestMarker?.activity && distance(p, this.nearestMarker) < 12) this.startActivity(this.nearestMarker.activity.id);
        return;
      }
      a.elapsed += dt;
      if (a.activity && a.mission.limit) {
        a.remaining -= dt;
        if (a.remaining <= 0) { phone(a.mission, 'Time ran out. Leave it for now; there is another run when you are ready.'); cooldowns[a.mission.id] = 15; this.active = null; this.refresh(); return; }
      }
      const s = (a.activity ? a.stages : a.mission.stages)[a.stage];
      if (distance(p, s.position) > 9 || a.elapsed < 1.3) return;
      if (['drive', 'deliver'].includes(s.kind) && !driving()) return;
      if (s.kind === 'escape' && stars() > 0) return;
      this.advance();
    }
  };
})();
