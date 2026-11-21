/* Connect the city renderer and gameplay systems through one live runtime. */
(() => {
  'use strict';
  const SF = window.SF, S = window.Sunfall;
  if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
  SF.THREE = THREE;
  SF.CONFIG = { ...S.Config, tuning: { ...S.Config.tuning, blockSize: 64, sidewalkOffset: 9 } };
  const anchors = {'Palma Strand':[-224,-224], 'Old Harbor':[224,96], 'Mirador Heights':[160,-224], 'Cinder Flats':[224,224], 'Glasspoint':[-32,96], 'Mariner Row':[-288,96]};
  const seen=new Set();
  function place(point) {
    if (!point || seen.has(point)) return;
    seen.add(point);
    const a=anchors[point.district] || [-224,-224];
    point.x=a[0]; point.z=a[1]+Math.round((point.z%37)/2); point.y=.24;
  }
  SF.missions.districts.forEach(d=>{const a=anchors[d.name]; d.x=a[0];d.z=a[1];});
  SF.missions.story.forEach(m=>{m.path.forEach(place);m.stages.forEach(o=>place(o.target));});
  SF.missions.activities.forEach(m=>{place(m.marker);place(m.destination);});
  SF.world = { build() {
    const rig = S.createRender(document.getElementById('viewport'));
    const world = S.createWorld(rig.scene);
    Object.assign(SF.world, world);
    SF.city = world.city;
    SF.city.streetGrid = { x: Array.from({length:10}, (_,i)=>-288+i*64), z: Array.from({length:10}, (_,i)=>-288+i*64) };
    SF.city.buildings = world.collisions.filter(b=>b.kind==='building');
    rig.collisions = world.collisions;
    SF.render = rig;
    SF.player.init();
    SF.missions.story[0].stages[0].target.z=-225;
    SF.missions.story[0].stages[0].target.x=-215;
    SF.missions.story[0].stages[1].target.z=-195;
    SF.missions.story[0].path[0]=SF.missions.story[0].stages[0].target;
    SF.missions.story[0].path[1]=SF.missions.story[0].stages[1].target;
    document.getElementById('start-screen').hidden = true;
    const marker = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3,.13,8,40), new THREE.MeshBasicMaterial({color:0x50ebce}));
    ring.rotation.x = -Math.PI/2; marker.add(ring);
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,9,8), new THREE.MeshBasicMaterial({color:0x50ebce,transparent:true,opacity:.5}));
    beacon.position.y=4.5; marker.add(beacon); rig.scene.add(marker);
    SF.world.objectiveMarker=marker;
    const contact=SF.player.figure({shirt:0xdbc08b,pants:0x39444b});
    contact.position.set(-213,.24,-224);contact.rotation.y=Math.PI;
    rig.scene.add(contact);
    rig.render = function () {
      const state=SF.main?.state;
      if (state?.playing) {
        if (!SF._captureScene) rig.follow(SF.player.position, SF.input.yaw, .016);
        world.update(state.time, SF.player.position);
      } else rig.title(state?.time || 0, true);
      const target=SF.missions.active?.nearestMarker;
      marker.visible=!!target;
      if(target) marker.position.set(target.x,.3,target.z);
      contact.userData.animate(.016,0);
      const sky=rig.scene.getObjectByName('Solano sunset sky');
      if(sky) sky.position.copy(rig.camera.position);
      rig.draw();
    };
    SF.vehicles.spawn('sedan', {x:-227,y:.1,z:-235});
  }};
})();
