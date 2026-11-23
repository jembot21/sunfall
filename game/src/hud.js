import { WEAPONS, WORLD } from './config.js';
import { buildingBounds, bridgeEndpoints, getDistrict, roads, safehouse } from './world.js';

const COLOURS = { cruiser: '#ff586b', officer: '#78b7ff', helicopter: '#fff0a8' };
const finite = (value) => Number.isFinite(value) ? value : 0;

export function createHUD() {
  const el = (id) => document.getElementById(id);
  const minimap = el('minimap');
  const context = minimap.getContext('2d');
  const stars = Array.from({ length: 5 }, (_, i) => el(`wanted-star-${i + 1}`));
  const slots = WEAPONS.map((weapon) => el(`weapon-${weapon.id}`));
  minimap.width = minimap.height = 180;
  minimap.hidden = false;
  let lastDraw = -1;

  function drawMap(player, police, missions, drivenCar) {
    const size = 180;
    const scale = missions.isFinale ? 0.13 : 0.24;
    const x = (value) => 90 + (value - player.position.x) * scale;
    const z = (value) => 90 + (value - player.position.z) * scale;
    context.clearRect(0, 0, size, size);
    context.fillStyle = '#293b50'; // Solano Bay.
    context.fillRect(0, 0, size, size);
    context.fillStyle = '#45464c';
    context.fillRect(x(WORLD.shorelineX), z(-600), (600 - WORLD.shorelineX) * scale, 1200 * scale);
    context.fillRect(x(bridgeEndpoints.farShore.x - 260), z(-600), 280 * scale, 1200 * scale);
    context.fillStyle = '#938777';
    for (const road of roads) context.fillRect(x(road.minX), z(road.minZ), (road.maxX - road.minX) * scale, (road.maxZ - road.minZ) * scale);
    context.fillStyle = '#615d67';
    for (const block of buildingBounds) context.fillRect(x(block.minX), z(block.minZ), (block.maxX - block.minX) * scale, (block.maxZ - block.minZ) * scale);

    function blip(position, colour, radius = 3, diamond = false) {
      // Off-map units keep a bearing blip at the rim: every police unit is represented.
      const dx = x(position.x) - 90;
      const dz = z(position.z) - 90;
      const factor = Math.min(1, 79 / Math.max(1, Math.abs(dx), Math.abs(dz)));
      const bx = 90 + dx * factor;
      const bz = 90 + dz * factor;
      context.fillStyle = colour;
      context.beginPath();
      if (diamond) {
        context.moveTo(bx, bz - radius - 1); context.lineTo(bx + radius + 1, bz);
        context.lineTo(bx, bz + radius + 1); context.lineTo(bx - radius - 1, bz); context.closePath();
      } else context.arc(bx, bz, radius, 0, Math.PI * 2);
      context.fill();
    }
    blip(safehouse, '#95e2c2', 3, true);
    blip(missions.marker, '#ffd28a', 4, true);
    for (const unit of police.units) blip(unit.position, COLOURS[unit.kind], unit.kind === 'officer' ? 2 : 3, unit.kind === 'helicopter');
    context.save();
    context.translate(90, 90);
    context.rotate(-(drivenCar ? drivenCar.heading : player.rotation.y));
    context.fillStyle = '#fff1d8';
    context.strokeStyle = '#171d29';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, 8); context.lineTo(-5, -5); context.lineTo(0, -2); context.lineTo(5, -5); context.closePath();
    context.fill(); context.stroke();
    context.restore();
    context.fillStyle = '#fff1d8';
    context.font = 'bold 10px Arial';
    context.fillText('N', 86, 13);
    context.font = '8px Arial';
    context.fillText('SOLANO BAY', 8, 169);
  }

  return {
    update({ player, police, cash, weapons, missions, drivenCar, elapsed, mode, hint }) {
      for (let i = 0; i < stars.length; i += 1) {
        stars[i].textContent = i < police.stars ? '★' : '☆';
        stars[i].style.color = i < police.stars ? '#ffb076' : '#807079';
        stars[i].style.textShadow = i < police.stars ? '0 0 16px #ff664966' : 'none';
      }
      el('wanted-label').textContent = police.stars ? `WANTED · ${police.stars} STARS${missions.isFinale ? ' · LOCKDOWN' : ''}` : 'SOLANO BAY · CLEAR';
      el('cash').textContent = `$${Math.floor(finite(cash)).toLocaleString('en-US')}`;
      el('district-label').textContent = `${getDistrict(player.position)} · ${drivenCar ? drivenCar.spec.name : 'On foot'}`;
      el('mission-name').textContent = missions.active ? `${missions.active.index + 1} / 9 · ${missions.name}` : missions.storyComplete ? 'STORY COMPLETE · BRIDGE RUN' : `DRE’S JOBS · ${missions.progress} / 9 COMPLETE`;
      el('objective-line').textContent = missions.objective;
      for (let i = 0; i < slots.length; i += 1) {
        const weapon = WEAPONS[i];
        const locked = !weapons.owned.has(weapon.id);
        slots[i].className = `weapon-slot${weapons.selected.id === weapon.id ? ' selected' : ''}${locked ? ' locked' : ''}`;
        slots[i].innerHTML = `<b>${weapon.key}</b><span>${weapon.name}</span><small>${locked ? `LOCKED · $${weapon.price.toLocaleString('en-US')}` : weapons.weapon.id === weapon.id ? 'EQUIPPED' : 'OWNED'}</small>`;
      }
      el('weapon-label').textContent = `${weapons.weapon.name} · ${weapons.weapon.id === 'fists' ? 'Click to swing' : 'Click to fire · ∞ ammo'} · Right-drag to aim`;
      el('hint-line').textContent = hint;
      for (const [name, readiness] of Object.entries(missions.crew)) el(`crew-${name.toLowerCase()}`).textContent = readiness;
      el('speedometer').hidden = !drivenCar;
      el('speed-value').textContent = String(Math.round(Math.abs(finite(drivenCar?.speed)) * 3.6));
      el('speed-state').textContent = missions.tyresDamaged ? 'TYRES DAMAGED' : drivenCar?.spec.name ?? '';
      el('lock-panel').hidden = !missions.isFinale;
      el('lock-fill').style.width = `${Math.round(missions.lock * 100)}%`;
      el('lock-value').textContent = missions.lock === 0 ? 'LOCK BROKEN' : `${Math.round(missions.lock * 100)}% TRACKING`;
      el('lockdown-timer').textContent = `${Math.max(0, Math.ceil(missions.timer ?? 0))}s TO LOCKDOWN`;
      el('bust-panel').hidden = !police.stars && police.state !== 'busted';
      el('bust-fill').style.width = `${Math.round(police.bustProgress * 100)}%`;
      el('bust-value').textContent = `${Math.round(police.bustProgress * 100)}%`;
      el('response-state').textContent = police.state === 'busted' ? 'SUSPECT IN CUSTODY'
        : !police.stars ? 'CHANNEL CLEAR' : police.seen ? 'SUSPECT IN SIGHT' : 'SEARCHING · SIGHT LOST';
      el('response-count').textContent = `${police.units.length} ACTIVE`;
      el('centre-banner').hidden = mode === 'title';
      el('centre-banner').textContent = mode === 'paused' ? 'PAUSED · ESC TO RESUME' : missions.banner;
      if (mode !== 'paused' && missions.banner && missions.active) {
        el('centre-banner').innerHTML = `<strong>${missions.banner}</strong><span class="banner-objective">${missions.objective}</span>`;
      }
      el('dialogue-line').textContent = missions.dialogue;
      const tick = Math.floor(elapsed * 10);
      if (lastDraw === tick) return;
      lastDraw = tick;
      const topUnits = [...police.units].sort((a, b) => a.kind === 'helicopter' && b.kind !== 'helicopter' ? -1
        : b.kind === 'helicopter' && a.kind !== 'helicopter' ? 1 : a.distanceToPlayer - b.distanceToPlayer).slice(0, 6);
      el('unit-list').innerHTML = topUnits.length ? topUnits.map((unit) =>
        `<div class="unit-row" data-unit="${unit.id}"><i style="background:${COLOURS[unit.kind]}"></i><b>${unit.id}</b><span>${unit.status}</span><em>${Math.round(finite(unit.distanceToPlayer))}m</em></div>`).join('')
        : '<div class="no-units">No response dispatched</div>';
      drawMap(player, police, missions, drivenCar);
    },
  };
}
