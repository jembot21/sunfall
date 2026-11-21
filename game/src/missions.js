(() => {
  const SF = globalThis.SF ||= {};
  const stage = (kind, x, z, text, line) => ({ kind, x, z, text, line });
  const story = [
    { title: 'First Favor', contact: 'Marco Reyes', district: 'Palma Strand', payout: 250, stages: [
      stage('go', -280, -241, 'Meet Marco in Palma Strand', 'Meet me in Palma Strand. I need someone who can keep an appointment.'),
      stage('drive', -210, -241, 'Drive to the Strand kiosk', 'Take a car down to the kiosk. Nico left a parcel with the clerk.'),
      stage('deliver', -280, -241, 'Bring the parcel back to Marco', 'Bring it back here. Coffee is on me if it stays dry.')
    ] },
    { title: 'Salt Run', contact: 'Marco Reyes', payout: 400, stages: [
      stage('go', 0, 45, 'Pick up the dock receipt', 'The dock clerk left our receipt by the gate. Go before he clocks out.'),
      stage('deliver', 45, 45, 'Take the receipt to Nico', 'Nico needs that receipt to get his van back. Meet him at the corner.')
    ] },
    { title: 'Borrowed Wheels', contact: 'Nico Vale', payout: 550, stages: [
      stage('go', 90, 0, 'Meet Nico at the garage', 'I got the van back, but it sounds like a drawer full of forks. Meet me at the garage.'),
      stage('drive', 90, 90, 'Drive to the service yard', 'Take your ride to the service yard. I left my tools under the bench.'),
      stage('deliver', 45, 90, 'Drop the tools at the garage annex', 'Drop them at the annex. My sister is covering the late shift.')
    ] },
    { title: 'Late Checkout', contact: 'Nico Vale', payout: 700, stages: [
      stage('go', -45, 0, 'Collect the motel keys', 'There are keys waiting at the motel desk. Tell them Nico sent you.'),
      stage('drive', -90, 45, 'Drive to the old marina', 'Take the keys to the marina. Suri has been waiting out in that wind all night.'),
      stage('escape', -90, 0, 'Reach the quay with no wanted stars', 'Meet us at the quay once the sirens are gone. Suri has a change of plans.')
    ] },
    { title: 'Glass Tide', contact: 'Suri Calder', payout: 850, stages: [
      stage('go', -45, -45, 'Find Suri by the seawall', 'I can see the whole bay from this wall. Come down before the fog rolls in.'),
      stage('deliver', 0, -90, 'Deliver the tide charts', 'Take these charts to the launch. The crew needs the marked page before dawn.')
    ] },
    { title: 'Second Crossing', contact: 'Suri Calder', payout: 1000, stages: [
      stage('go', 45, -45, 'Collect the envelope at the ramp', 'There is a dry envelope at the ramp. Keep it that way for me.'),
      stage('drive', 90, -90, 'Drive to the east landing', 'Meet me at the east landing. I can see your headlights from there.'),
      stage('deliver', 45, -90, 'Give the envelope to Lena', 'Lena is one block over. Let her open it herself.')
    ] },
    { title: 'Paper Harbor', contact: 'Lena Voss', payout: 1250, stages: [
      stage('go', -90, -90, 'Find Lena at the records office', 'Half the names in this envelope are spelled wrong. Meet me at the records office.'),
      stage('deliver', -45, -90, 'Bring the verified manifest to Lena', 'I need the signed manifest. Bring it to the steps and I can match every name.'),
      stage('escape', 0, -45, 'Reach the meeting point with no wanted stars', 'I have enough to find the ledger. Meet me when the street is quiet.')
    ] },
    { title: 'The Voss Ledger', contact: 'Lena Voss', payout: 2000, stages: [
      stage('go', 0, 90, 'Pick up the ledger at the archive', 'The ledger is at the archive. It has every payment they told us never happened.'),
      stage('drive', -90, 90, 'Drive the ledger across the bay', 'Bring it across the bay. I found someone who will put the names in print.'),
      stage('deliver', -45, 45, 'Deliver the ledger to Lena', 'I am by the windows. Bring it in, then stay for coffee. We have earned one.')
    ] }
  ];
  const activities = [
    { title: 'Taxi Fare', payout: 120, limit: 70, stages: [
      stage('drive', 45, 0, 'Pick up the taxi fare'),
      stage('drive', 90, 45, 'Drop off the passenger')
    ] },
    { title: 'Courier Run', payout: 160, limit: 65, stages: [
      stage('go', 0, -45, 'Pick up the message'),
      stage('deliver', -90, -45, 'Deliver the message')
    ] },
    { title: 'Street Race', payout: 220, limit: 45, stages: [
      stage('drive', 90, 0, 'Reach the first race checkpoint'),
      stage('drive', 90, 90, 'Reach the finish line')
    ] },
    { title: 'Stash Pickup', payout: 90, stages: [
      stage('go', -45, 90, 'Collect the stash')
    ] }
  ];
  const missions = SF.missions = {
    story, list: story, activities, active: null, storyDone: 0, cash: 0, displayObjective: '',
    get objective() { return this.active?.objective ?? this.displayObjective; },
    setObjective(text) { this.displayObjective = String(text ?? ''); return this.displayObjective; },
    get nearestMarker() { return this.active?.marker ?? null; },
    startStory() { return start(story[this.storyDone], true); },
    startActivity(index) { return start(activities[index], false); },
    reset(done = 0, cash = 0) {
      this.storyDone = Math.max(0, Math.min(story.length, done));
      this.cash = cash;
      this.active = null;
      this.displayObjective = '';
    },
    update(dt, position, driving, wanted) {
      if (!this.active) {
        for (let index = 0; index < activities.length; index++) {
          if (SF.input?.pressed('Digit' + (index + 1))) return this.startActivity(index);
        }
        if (SF.input?.pressed('KeyM')) this.startStory();
        return;
      }
      const run = this.active;
      if (run.remaining !== null && (run.remaining -= dt) <= 0) {
        this.active = null;
        return;
      }
      const target = run.marker;
      if (!position || Math.hypot(position.x - target.x, position.z - target.z) > 9) return;
      if (target.kind === 'drive' && !driving) return;
      if (run.title === 'Taxi Fare' && SF.runtime?.vehicle()?.type
          && !String(SF.runtime.vehicle().type.name ?? SF.runtime.vehicle().type).toLowerCase().includes('taxi')) return;
      if (target.kind === 'escape' && wanted > 0) return;
      run.index++;
      if (run.index < run.definition.stages.length) return announce(run);
      this.active = null;
      this.cash += run.definition.payout;
      if (SF.player && Number.isFinite(SF.player.cash)) SF.player.cash = this.cash;
      if (run.story) this.storyDone++;
      if (SF.state) {
        SF.state.cash = this.cash;
        SF.state.storyDone = this.storyDone;
        if (run.story) SF.state.unlocks.push(run.title);
        SF.save?.store();
      }
      SF.audio?.mission?.();
    }
  };
  function start(definition, isStory) {
    if (!definition || missions.active) return false;
    const run = missions.active = {
      definition, story: isStory, title: definition.title, index: 0,
      remaining: definition.limit ?? null, objective: '', marker: null
    };
    announce(run);
    return true;
  }
  function announce(run) {
    const target = run.definition.stages[run.index];
    run.marker = target;
    run.objective = target.text;
    if (target.line) SF.phone?.call(run.definition.contact, target.line);
  }
})();
