// City contract: SF.city exposes its group and collision circles {x,z,r} for later movement modules.
(function (SF) {
  const { blockSize, roadWidth, blocksAcross } = SF.CONFIG.city;
  const group = new THREE.Group(), colliders = [];
  const max = SF.CONFIG.perf.maxBuildings;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0.02, emissive: 0x18100d, emissiveMap: makeWindows(), emissiveIntensity: 0.75 });
  const downtownWindows = makeWindows(0.72), outerWindows = makeWindows(0.34);
  material.emissiveMap = outerWindows;
  function makeWindows(density = 0.43) {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#242633'; ctx.fillRect(0, 0, 64, 64);
    for (let y = 4; y < 62; y += 10) for (let x = 4; x < 62; x += 9) { ctx.fillStyle = SF.chance(density) ? '#ffd19a' : '#39404b'; ctx.fillRect(x, y, 4, 5); }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1, 2); return texture;
  }
  const mesh = new THREE.InstancedMesh(geometry, material, max);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const dummy = new THREE.Object3D(), palette = SF.CONFIG.colors.building;
  let index = 0;
  for (let iz = 0; iz < blocksAcross && index < max; iz++) for (let ix = 0; ix < blocksAcross && index < max; ix++) {
    const x = (ix - (blocksAcross - 1) / 2) * blockSize, z = (iz - (blocksAcross - 1) / 2) * blockSize;
    if (SF.chance(0.1)) continue;
    const height = SF.range(15, 35) + (1 - Math.min(1, Math.hypot(x, z) / 550)) * SF.range(18, 65);
    const w = SF.range(28, 56), d = SF.range(28, 55);
    dummy.position.set(x + SF.range(-12, 12), height / 2, z + SF.range(-12, 12)); dummy.scale.set(w, height, d); dummy.updateMatrix();
      const downtown = Math.hypot(x, z) < 190;
      const density = downtown ? 0.72 : 0.34;
      const tint = new THREE.Color(SF.pick(palette));
      tint.multiplyScalar(SF.random.range(density * 0.92, density * 1.08) + (downtown ? 0.7 : 0.55));
      mesh.setMatrixAt(index, dummy.matrix); mesh.setColorAt(index, tint);
      colliders.push({ x: dummy.position.x, z: dummy.position.z, r: Math.max(w, d) * 0.48 }); index++;
  }
  mesh.count = index; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; group.add(mesh);
  const trunkGeo = new THREE.CylinderGeometry(0.55, 0.8, 9, 5), trunkMat = new THREE.MeshStandardMaterial({ color: 0x73503a });
  const trunk = new THREE.InstancedMesh(trunkGeo, trunkMat, 44); trunk.castShadow = true;
  const palm = new THREE.Object3D();
  for (let i = 0; i < 44; i++) { const x = -490 + Math.floor(i / 2) * 25, z = (i % 2 ? 1 : -1) * 38; palm.position.set(x, 4.5, z); palm.updateMatrix(); trunk.setMatrixAt(i, palm.matrix); }
  group.add(trunk);
  const frondGeo = new THREE.ConeGeometry(1.2, 12, 4), frondMat = new THREE.MeshStandardMaterial({ color: 0x426449, roughness: 0.9 });
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, 220), leaf = new THREE.Object3D();
  for (let i = 0; i < 44; i++) { const x = -490 + Math.floor(i / 2) * 25, z = (i % 2 ? 1 : -1) * 38; for (let j = 0; j < 5; j++) { const n = i * 5 + j; leaf.position.set(x + Math.cos(j * 1.256) * 4, 9, z + Math.sin(j * 1.256) * 4); leaf.rotation.set(0, j * 1.256, -0.82); leaf.updateMatrix(); fronds.setMatrixAt(n, leaf.matrix); } }
  group.add(fronds);
  const poleGeo = new THREE.CylinderGeometry(0.18, 0.28, 8, 6), poleMat = new THREE.MeshStandardMaterial({ color: 0x55545a, metalness: 0.55 });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, 36), lampGeo = new THREE.SphereGeometry(0.7, 8, 6), lampMat = new THREE.MeshBasicMaterial({ color: 0xffd39a });
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, 36);
  for (let i = 0; i < 36; i++) { const row = Math.floor(i / 6), col = i % 6, x = (col - 2.5) * 92 + 18, z = (row - 2.5) * 92 - 17; dummy.position.set(x, 4, z); dummy.updateMatrix(); poles.setMatrixAt(i, dummy.matrix); dummy.position.set(x, 8, z); dummy.updateMatrix(); lamps.setMatrixAt(i, dummy.matrix); }
  group.add(poles, lamps); SF.render.scene.add(group); SF.city = { group, colliders };
})(window.SF);
