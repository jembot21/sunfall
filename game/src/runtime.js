(() => {
  const SF = globalThis.SF ||= {};
  const state = SF.state = {
    mode: 'menu', elapsed: 0, district: null, cash: 0, storyDone: 0,
    unlocks: [], safehouse: null
  };
  function update(system, ...args) {
    const tick = system?.update || system?.step;
    if (typeof tick === 'function') tick.apply(system, args);
  }
  const runtime = SF.runtime = {
    vehicle() {
      const player = SF.player;
      return player?.vehicle || player?.inVehicle || SF.vehicles?.current || null;
    },
    position() {
      const car = this.vehicle();
      return car?.mesh?.position || car?.position || SF.player?.mesh?.position || SF.player?.position;
    },
    wanted() {
      const police = SF.police;
      return Number(police?.stars ?? police?.wanted?.stars ?? police?.wantedLevel ?? police?.wanted) || 0;
    },
    start(save = null) {
      const spawn = SF.player?.mesh?.position || SF.player?.position;
      const home = SF.world?.safehouse || SF.world?.spawn || spawn;
      state.safehouse = save?.safehouse ?? (home ? { x: home.x, y: home.y, z: home.z } : null);
      const start = save?.safehouse || SF.world?.spawn;
      if (start) {
        SF.player?.position?.set?.(start.x, start.y ?? 0, start.z);
        SF.player?.mesh?.position?.set?.(start.x, start.y ?? 0, start.z);
        const heading = Number.isFinite(start.heading) ? start.heading : SF.player?.heading;
        if (Number.isFinite(heading) && SF.player) {
          SF.player.heading = heading;
          if (SF.player.mesh) SF.player.mesh.rotation.y = heading;
          if (SF.input) SF.input.yaw = heading + Math.PI;
        }
      }
      state.elapsed = 0;
      state.cash = save?.cash ?? 0;
      if (SF.player) SF.player.cash = state.cash;
      state.storyDone = save?.storyDone ?? 0;
      state.unlocks = Array.isArray(save?.unlocks) ? [...save.unlocks] : [];
      SF.phone.clear();
      SF.missions.reset(state.storyDone, state.cash);
      SF.missions.startStory();
      state.mode = 'play';
      SF.save.store();
    },
    step(dt) {
      dt = Math.min(0.05, Math.max(0, dt));
      if (SF.input.pressed('Escape') || SF.input.pressed('KeyP')) {
        if (state.mode === 'play') {
          state.mode = 'pause';
          document.exitPointerLock?.();
        } else if (state.mode === 'pause') state.mode = 'play';
      }
      SF.phone.update();
      if (state.mode === 'play') {
        state.elapsed += dt;
        update(SF.player, dt);
        update(SF.vehicles, dt);
        update(SF.traffic, dt);
        update(SF.peds, dt);
        const fired = SF.weapons?.shots;
        const shotCount = Array.isArray(fired) ? fired.length : fired;
        update(SF.weapons, dt);
        const shots = SF.weapons?.shots;
        if ((Array.isArray(shots) ? shots.length : shots) > shotCount) SF.audio.gunshot();
        update(SF.police, dt);
        if (Number.isFinite(SF.player?.cash)) {
          state.cash = SF.player.cash;
          SF.missions.cash = state.cash;
        }
        const pos = this.position();
        if (pos) {
          const district = SF.city?.districtAt?.(pos.x, pos.z) ?? SF.world?.districtAt?.(pos.x, pos.z);
          state.district = district?.name ?? district ?? state.district ?? 'Palma Strand';
        }
        SF.missions.update(dt, pos, Boolean(this.vehicle()), this.wanted());
        if (SF.player?.busted || SF.police?.busted) state.mode = 'busted';
        else if (SF.player?.health <= 0 || SF.player?.dead) state.mode = 'wasted';
        if (state.mode !== 'play') document.exitPointerLock?.();
      }
      SF.audio.update({
        playing: state.mode === 'play', driving: Boolean(this.vehicle()),
        walking: ['KeyW', 'KeyA', 'KeyS', 'KeyD'].some(SF.input.isDown),
        speed: Number(this.vehicle()?.speed) || 0, wanted: this.wanted()
      });
      update(SF.hud, dt);
      SF.input.endFrame();
    }
  };
})();
