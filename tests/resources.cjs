'use strict';
const assert = require('node:assert/strict');
const { environment } = require('./smoke.cjs');
const { SF, counts, context } = environment();
SF.main.boot();
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
vm.runInContext(fs.readFileSync(path.join(__dirname,'../game/src/hud.js'),'utf8'),context,{filename:'hud.js'});
SF.hud.init();
const position=SF.player.mesh.position;
SF.peds.people[0].mesh.position.set(position.x+3,0,position.z-5);
SF.police.crime('gunshot',position);SF.police.crime('shoot',position);SF.police.update(.016,0);
assert.equal(SF.police.stars,3);
assert.ok(SF.police.units.some(u=>u.kind==='air'&&u.mesh),'three-star support is an actual scene unit');
assert.ok(counts.textures > 0, 'builders actually constructed their shared textures');
assert.ok(counts.textures <= 12, 'CanvasTexture budget exceeded: ' + counts.textures + ' > 12');
const instances = counts.instances.filter(x => x.count > 0);
assert.ok(instances.length >= 3, 'city requires nonempty instanced buildings, palms and props');
const names = instances.map(x => [x.name, x.geometry?.type, ...Object.keys(x.userData || {})].filter(Boolean).join(' '));
// Named groups prove each city category, rather than accepting arbitrary instances.
for (const [label, pattern] of [['buildings', /build|facade/i], ['palms', /palm|trunk|frond/i], ['props', /prop|lamp|bench|bollard|wood|metal/i]]) {
  assert.ok(names.some(n => pattern.test(n)), label + ' must have a named InstancedMesh');
}
console.log('PASS resources: ' + counts.textures + '/12 CanvasTextures; ' + instances.length + ' nonempty InstancedMesh batches for buildings, palms and props');
