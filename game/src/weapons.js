(() => {
  'use strict';
  const SF = globalThis.SF ??= {};
  const profiles = {
    punch: { range: 1.65, width: .62, damage: 35, delay: .4, noise: 12 },
    shot: { range: 38, width: .37, damage: 55, delay: .27, noise: 31 }
  };
  let cooldown = 0, animation = 0, held = false, pistolModel;

  function hit(kind) {
    const player = SF.player, origin = player.position;
    if (!origin || player.car) return null;
    const profile = profiles[kind];
    const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
    const officers = SF.police?.officers ?? [];
    const targets = [...(SF.peds?.instances ?? []), ...officers];
    let victim = null, nearest = profile.range;
    for (const target of targets) {
      if (target.health <= 0) continue;
      const point = target.mesh.position;
      const dx = point.x - origin.x, dz = point.z - origin.z;
      const depth = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      if (depth < 0 || depth >= nearest || side > profile.width ||
          SF.police?.clearLine(origin, point) === false) continue;
      victim = target;
      nearest = depth;
    }
    const officer = officers.includes(victim);
    if (victim || kind === 'shot') SF.police?.report(officer ? 'officer' : kind, origin, victim);
    if (victim) victim.health = Math.max(0, victim.health - profile.damage);
    if (victim || kind === 'shot') SF.peds?.alarm(origin, profile.noise);
    return victim;
  }

  function model() {
    const T = SF.THREE ?? globalThis.THREE;
    const hand = SF.player.mesh?.userData.arms[1]?.children.find(child => child.isGroup);
    if (!T || !hand) return null;
    const group = new T.Group();
    group.position.set(0, -.26, .1);
    const material = new T.MeshStandardMaterial({ color: 0x252b35 });
    const slide = new T.Mesh(new T.BoxGeometry(.075, .29, .085), material);
    slide.position.y = -.075;
    const grip = new T.Mesh(new T.BoxGeometry(.071, .095, .14), material);
    grip.position.z = -.065;
    group.add(slide, grip);
    hand.add(group);
    return group;
  }

  SF.weapons = {
    equipped: 'melee',
    pose: null,
    action: 0,
    lastHit: null,
    reset() {
      this.equipped = 'melee';
      this.pose = null;
      this.action = 0;
      this.lastHit = null;
      cooldown = animation = 0;
      held = false;
      if (pistolModel) pistolModel.visible = false;
    },
    update(dt, input = {}) {
      cooldown = Math.max(0, cooldown - dt);
      animation = Math.max(0, animation - dt);
      if (input.weapon === 'pistol' || input.weapon === 'melee') {
        if (this.equipped !== input.weapon) animation = 0;
        this.equipped = input.weapon;
      }
      const pistol = this.equipped === 'pistol';
      if (pistol && !pistolModel) pistolModel = model();
      if (pistolModel) pistolModel.visible = pistol;
      if (input.aim && Number.isFinite(input.aimHeading)) SF.player.heading = input.aimHeading;
      const pressed = Boolean(input.attack);
      if (pressed && !held && cooldown === 0 && !SF.player.car) {
        const kind = pistol ? 'shot' : 'punch';
        if (pistol) SF.audio?.gunshot();
        this.lastHit = hit(kind);
        cooldown = profiles[kind].delay;
        animation = pistol ? .15 : .28;
      }
      held = pressed;
      this.pose = pistol && (input.aim || animation > 0) ? 'aim' :
        !pistol && animation > 0 ? 'punch' : null;
      this.action = pistol ? animation / .15 : Math.sin(Math.PI * animation / .28);
    }
  };
})();
