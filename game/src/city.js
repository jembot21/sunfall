(function () {
  var group = new THREE.Group();
  var palette = SF.CONFIG.palette.buildings;
  var buildingGeo = new THREE.BoxGeometry(1, 1, 1);
  var roofGeo = new THREE.BoxGeometry(1, 1, 1);
  var dummy = new THREE.Object3D();
  var windowCanvas = document.createElement('canvas');
  windowCanvas.width = 128; windowCanvas.height = 256;
  var wx = windowCanvas.getContext('2d');
  wx.fillStyle = '#e9c5b4'; wx.fillRect(0, 0, 128, 256);
  for (var wy = 9; wy < 250; wy += 23) for (var xx = 8; xx < 124; xx += 18) {
    wx.fillStyle = '#493d58'; wx.fillRect(xx - 2, wy - 2, 13, 17);
    wx.fillStyle = ((xx * 3 + wy * 7) % 5 === 0) ? '#ffd49a' : '#7bd9db';
    wx.globalAlpha = ((xx + wy) % 4 === 0) ? 0.46 : 0.93; wx.fillRect(xx, wy, 9, 13); wx.globalAlpha = 1;
  }
  var emissionCanvas = document.createElement('canvas');
  emissionCanvas.width = 128; emissionCanvas.height = 256;
  var ex = emissionCanvas.getContext('2d');
  ex.fillStyle = '#000'; ex.fillRect(0, 0, 128, 256);
  for (var ey = 9; ey < 250; ey += 23) for (var exx = 8; exx < 124; exx += 18) if ((exx * 3 + ey * 7) % 5 === 0 || (exx + ey) % 4 !== 0) {
    ex.fillStyle = ((exx + ey) % 3 === 0) ? '#b2eaff' : '#ffcb77'; ex.fillRect(exx, ey, 9, 13);
  }
  var windowTex = new THREE.CanvasTexture(windowCanvas); windowTex.encoding = THREE.sRGBEncoding; windowTex.wrapS = windowTex.wrapT = THREE.RepeatWrapping;
  var emissionTex = new THREE.CanvasTexture(emissionCanvas); emissionTex.encoding = THREE.sRGBEncoding; emissionTex.wrapS = emissionTex.wrapT = THREE.RepeatWrapping;
  var buildingMat = new THREE.MeshStandardMaterial({ map: windowTex, emissiveMap: emissionTex, emissive: '#ffe3af', emissiveIntensity: 0.68, roughness: 0.82 });
  var roofMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
  var lots = [];
  for (var gx = -3; gx <= 3; gx++) for (var gz = -3; gz <= 3; gz++) {
    var x = gx * 82, z = gz * 82;
    var count = SF.random.chance(0.34) ? 2 : 1;
    for (var n = 0; n < count; n++) {
      var w = SF.random.range(count === 1 ? 26 : 15, count === 1 ? 39 : 23);
      var d = SF.random.range(count === 1 ? 25 : 15, count === 1 ? 38 : 23);
      var ox = count === 1 ? 0 : (n === 0 ? -13 : 13);
      var oz = count === 1 ? 0 : SF.random.range(-8, 8);
      var height = SF.random.range(12, 30) + Math.max(0, 50 - Math.hypot(x - 8, z + 4) * 0.14);
      height = Math.min(70, height);
      lots.push({ x: x + ox, z: z + oz, w: w, d: d, h: height, color: palette[Math.floor(SF.random.next() * palette.length)] });
    }
  }
  var buildings = new THREE.InstancedMesh(buildingGeo, buildingMat, lots.length);
  var roofs = new THREE.InstancedMesh(roofGeo, roofMat, lots.length);
  for (var b = 0; b < lots.length; b++) {
    var lot = lots[b];
    dummy.position.set(lot.x, lot.h / 2, lot.z); dummy.scale.set(lot.w, lot.h, lot.d); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    buildings.setMatrixAt(b, dummy.matrix); buildings.setColorAt(b, new THREE.Color(lot.color).offsetHSL((b % 3 - 1) * 0.015, 0.08, 0.025));
    dummy.position.set(lot.x, lot.h + 0.45, lot.z); dummy.scale.set(lot.w + 0.7, 0.9, lot.d + 0.7); dummy.updateMatrix();
    roofs.setMatrixAt(b, dummy.matrix); roofs.setColorAt(b, new THREE.Color(lot.color).multiplyScalar(0.42));
  }
  buildings.castShadow = true; buildings.receiveShadow = true; roofs.castShadow = true;
  group.add(buildings, roofs);
  var colliders = lots.map(function (l) { return { x: l.x, z: l.z, r: Math.max(l.w, l.d) * 0.45 }; });

  var palmPoints = [];
  for (var coastZ = -260; coastZ <= 260; coastZ += 32) palmPoints.push({ x: -254, z: coastZ, h: SF.random.range(7, 11) });
  for (var streetZ = -246; streetZ <= 246; streetZ += 82) for (var streetX = -205; streetX <= 287; streetX += 82) {
    if (Math.abs(streetX) < 205 && Math.abs(streetZ) < 205 && SF.random.chance(0.56)) continue;
    palmPoints.push({ x: streetX + 11, z: streetZ + 11, h: SF.random.range(7, 10) });
  }
  var trunkGeo = new THREE.CylinderGeometry(0.36, 0.64, 1, 6);
  var trunkMat = new THREE.MeshStandardMaterial({ color: '#936342', roughness: 1 });
  var trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, palmPoints.length);
  var frondGeo = new THREE.PlaneGeometry(1.25, 6, 1, 1);
  var frondMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.94, side: THREE.DoubleSide });
  var frondsA = new THREE.InstancedMesh(frondGeo, frondMat, palmPoints.length * 6);
  var frondsB = new THREE.InstancedMesh(frondGeo, frondMat, palmPoints.length * 6);
  var leafColors = ['#25875e','#319b67','#49ac68'];
  var fi = 0;
  palmPoints.forEach(function (p) {
    dummy.position.set(p.x, p.h / 2, p.z); dummy.scale.set(1, p.h, 1); dummy.rotation.set(0, 0, (SF.random.next() - 0.5) * 0.06); dummy.updateMatrix(); trunkMesh.setMatrixAt(palmPoints.indexOf(p), dummy.matrix);
    for (var f = 0; f < 6; f++) {
      var angle = f * Math.PI / 3;
      dummy.position.set(p.x + Math.cos(angle) * 2.35, p.h - 0.5, p.z + Math.sin(angle) * 2.35);
      dummy.scale.set(1, 1, 1); dummy.rotation.set(-0.4, -angle, 0.22); dummy.updateMatrix();
      frondsA.setMatrixAt(fi, dummy.matrix); frondsA.setColorAt(fi, new THREE.Color(leafColors[f % 3]));
      dummy.rotation.set(-0.4, -angle + Math.PI / 2, 0.22); dummy.updateMatrix();
      frondsB.setMatrixAt(fi, dummy.matrix); frondsB.setColorAt(fi, new THREE.Color(leafColors[(f + 1) % 3]));
      fi++;
    }
  });
  trunkMesh.castShadow = true; frondsA.castShadow = frondsB.castShadow = true;
  group.add(trunkMesh, frondsA, frondsB);

  var lampPoints = [];
  for (var lz = -246; lz <= 246; lz += 82) for (var lx = -246; lx <= 246; lx += 82) {
    lampPoints.push({ x: lx + 8, z: lz - 8 });
  }
  var poleGeo = new THREE.CylinderGeometry(0.17, 0.24, 8, 6);
  var poleMesh = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: '#544c61', metalness: 0.4, roughness: 0.6 }), lampPoints.length);
  var lampGeo = new THREE.SphereGeometry(0.62, 8, 6);
  var lampMesh = new THREE.InstancedMesh(lampGeo, new THREE.MeshStandardMaterial({ color: '#ffc778', emissive: '#ff9a3c', emissiveIntensity: 1.8 }), lampPoints.length);
  lampPoints.forEach(function (p, i) { dummy.position.set(p.x, 4, p.z); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); poleMesh.setMatrixAt(i, dummy.matrix); dummy.position.y = 8.1; dummy.scale.set(1, 0.8, 1); dummy.updateMatrix(); lampMesh.setMatrixAt(i, dummy.matrix); });
  group.add(poleMesh, lampMesh);

  function makeSign(text, color) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 128;
    var g = c.getContext('2d'); g.fillStyle = '#20172d'; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = color; g.lineWidth = 8; g.strokeRect(5, 5, 502, 118);
    g.fillStyle = color; g.font = 'bold 42px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 64, 470);
    var tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    return new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  }
  var brandNames = ['SOLANO COLA','BAY FM 99.1','HOTEL MARISOL','PALMA AUTOS'];
  var brandColors = ['#ff584d','#69def0','#ffb65c','#64e1a0'];
  var billboardMat = brandNames.map(function (name, i) { return makeSign(name, brandColors[i]); });
  var boardGeo = new THREE.BoxGeometry(16, 4.5, 0.8);
  var boardPoleGeo = new THREE.BoxGeometry(0.65, 7, 0.65);
  for (var brand = 0; brand < billboardMat.length; brand++) {
    var boards = new THREE.InstancedMesh(boardGeo, billboardMat[brand], 3);
    for (var brandSlot = 0; brandSlot < 3; brandSlot++) {
      var bb = brandSlot * billboardMat.length + brand;
      var bx = -205 + (bb % 6) * 82, bz = -230 + Math.floor(bb / 6) * 460;
      dummy.position.set(bx, 17 + (bb % 3) * 3, bz); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      boards.setMatrixAt(brandSlot, dummy.matrix);
    }
    boards.castShadow = true; group.add(boards);
  }
  var boardPoles = new THREE.InstancedMesh(boardPoleGeo, trunkMat, 12);
  for (var bp = 0; bp < 12; bp++) {
    var poleX = -205 + (bp % 6) * 82, poleZ = -230 + Math.floor(bp / 6) * 460;
    dummy.position.set(poleX, 11 + (bp % 3) * 3, poleZ); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); boardPoles.setMatrixAt(bp, dummy.matrix);
  }
  group.add(boardPoles);

  var benchMat = new THREE.MeshStandardMaterial({ color: '#aa714c', roughness: 0.9 });
  var benchGeo = new THREE.BoxGeometry(5, 0.35, 1.4);
  var benchLegGeo = new THREE.BoxGeometry(0.35, 1.3, 0.35);
  var benches = new THREE.InstancedMesh(benchGeo, benchMat, 10);
  var benchLegs = new THREE.InstancedMesh(benchLegGeo, benchMat, 20);
  for (var bn = 0; bn < 10; bn++) {
    var marketX = 123 + (bn % 5) * 25, marketZ = -65 + Math.floor(bn / 5) * 130;
    dummy.position.set(marketX, 1.5, marketZ); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); benches.setMatrixAt(bn, dummy.matrix);
    for (var bl = -1; bl <= 1; bl += 2) { dummy.position.set(marketX + bl * 1.8, 0.8, marketZ); dummy.updateMatrix(); benchLegs.setMatrixAt(bn * 2 + (bl > 0 ? 1 : 0), dummy.matrix); }
  }
  group.add(benches, benchLegs);
  var kioskMat = new THREE.MeshStandardMaterial({ color: '#f0ae55', roughness: 0.8 });
  var kioskGeo = new THREE.BoxGeometry(9, 6, 7);
  var kioskMesh = new THREE.InstancedMesh(kioskGeo, kioskMat, 3);
  var canopyMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(10, 0.8, 8), billboardMat[0], 3);
  for (var ki = 0; ki < 3; ki++) {
    dummy.position.set(175 + ki * 35, 3, 0); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); kioskMesh.setMatrixAt(ki, dummy.matrix);
    dummy.position.y = 6.4; dummy.updateMatrix(); canopyMesh.setMatrixAt(ki, dummy.matrix); canopyMesh.setColorAt(ki, new THREE.Color(brandColors[ki]));
  }
  group.add(kioskMesh, canopyMesh);

  var wheel = new THREE.Group(); wheel.position.set(-315, 27, 90);
  var wheelMat = new THREE.MeshStandardMaterial({ color: '#e9a2d1', metalness: 0.42, roughness: 0.48 });
  var rim = new THREE.Mesh(new THREE.TorusGeometry(24, 0.75, 8, 48), wheelMat); wheel.add(rim);
  var spokeGeo = new THREE.CylinderGeometry(0.22, 0.22, 48, 6);
  var spokes = new THREE.InstancedMesh(spokeGeo, wheelMat, 12);
  for (var sp = 0; sp < 12; sp++) { dummy.position.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, Math.PI / 2 + sp * Math.PI / 6); dummy.updateMatrix(); spokes.setMatrixAt(sp, dummy.matrix); }
  spokes.castShadow = true; wheel.add(spokes);
  var hub = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffbd65', emissive: '#ff843d', emissiveIntensity: 0.4 })); wheel.add(hub);
  var cabinGeo = new THREE.BoxGeometry(3.4, 3.6, 3.4);
  var cabinMat = new THREE.MeshStandardMaterial({ color: '#ffbf54', roughness: 0.72 });
  var cabins = new THREE.InstancedMesh(cabinGeo, cabinMat, 12);
  for (var cab = 0; cab < 12; cab++) { var a = cab * Math.PI / 6; dummy.position.set(Math.sin(a) * 24, -Math.cos(a) * 24, 0); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); cabins.setMatrixAt(cab, dummy.matrix); }
  cabins.castShadow = true; wheel.add(cabins);
  var supportGeo = new THREE.CylinderGeometry(0.55, 0.9, 30, 8);
  var support1 = new THREE.Mesh(supportGeo, wheelMat); support1.position.set(-8, -23, -1); support1.rotation.z = -0.34; wheel.add(support1);
  var support2 = support1.clone(); support2.position.x = 8; support2.rotation.z = 0.34; wheel.add(support2);
  wheel.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
  group.add(wheel);
  SF.render.scene.add(group);
  SF.city = {
    group: group,
    colliders: colliders,
    update: function (dt) { wheel.rotation.z += Math.min(dt, 0.05) * 0.12; }
  };
}());
