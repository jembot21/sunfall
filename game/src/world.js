// World contract: SF.world.group is already attached to the render scene; helpers use world X/Z coordinates.
(function (SF) {
  const { blockSize, roadWidth, blocksAcross, coastX } = SF.CONFIG.city;
  const span = blockSize * blocksAcross + roadWidth;
  const group = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(span * 1.8, span * 1.8), new THREE.MeshLambertMaterial({ color: SF.CONFIG.colors.sand }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.08; ground.receiveShadow = true; group.add(ground);
  const inland = new THREE.Mesh(new THREE.PlaneGeometry(span * 1.5, span * 1.6), new THREE.MeshLambertMaterial({ color: SF.CONFIG.colors.asphalt }));
  inland.rotation.x = -Math.PI / 2; inland.position.set(0, -0.04, 0); inland.receiveShadow = true; group.add(inland);
  const oceanGeometry = new THREE.PlaneGeometry(1800, 1800, 1, 1);
  const oceanColors = [new THREE.Color(0x194b65), new THREE.Color(0x2b7180), new THREE.Color(0x347b86), new THREE.Color(0x1e536d)];
  oceanGeometry.setAttribute('color', new THREE.Float32BufferAttribute(oceanColors.flatMap(c => [c.r, c.g, c.b]), 3));
  const oceanMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.94 });
  const ocean = new THREE.Mesh(oceanGeometry, oceanMat);
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(coastX - 900, -0.12, 0); group.add(ocean);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(50, span * 1.7), new THREE.MeshLambertMaterial({ color: SF.CONFIG.colors.sand }));
  beach.rotation.x = -Math.PI / 2; beach.position.set(coastX + 24, -0.02, 0); group.add(beach);
  const roadMat = new THREE.MeshLambertMaterial({ color: SF.CONFIG.colors.asphalt });
  const walkMat = new THREE.MeshLambertMaterial({ color: SF.CONFIG.colors.sidewalk });
  const markMat = new THREE.MeshBasicMaterial({ color: 0xd7c69a });
  const roadLen = span * 1.5;
  for (let i = 0; i < blocksAcross; i++) {
    const p = (i - (blocksAcross - 1) / 2) * blockSize;
    const vertical = new THREE.Mesh(new THREE.BoxGeometry(roadWidth, 0.12, roadLen), roadMat);
    vertical.position.set(p, 0, 0); vertical.receiveShadow = true; group.add(vertical);
    const horizontal = new THREE.Mesh(new THREE.BoxGeometry(roadLen, 0.12, roadWidth), roadMat);
    horizontal.position.set(0, 0, p); horizontal.receiveShadow = true; group.add(horizontal);
    for (const side of [-1, 1]) {
      const curbV = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, roadLen), walkMat); curbV.position.set(p + side * (roadWidth / 2 + 1.2), 0.02, 0); group.add(curbV);
      const curbH = new THREE.Mesh(new THREE.BoxGeometry(roadLen, 0.18, 2.4), walkMat); curbH.position.set(0, 0.02, p + side * (roadWidth / 2 + 1.2)); group.add(curbH);
    }
  }
  const dashGeo = new THREE.BoxGeometry(0.28, 0.035, 5);
  for (let i = 0; i < blocksAcross; i++) {
    const p = (i - (blocksAcross - 1) / 2) * blockSize;
    for (let t = -roadLen / 2; t < roadLen / 2; t += 11) {
      const a = new THREE.Mesh(dashGeo, markMat); a.position.set(p, 0.09, t); group.add(a);
      const b = new THREE.Mesh(dashGeo, markMat); b.rotation.y = Math.PI / 2; b.position.set(t, 0.09, p); group.add(b);
    }
  }
  SF.render.scene.add(group);
  SF.world = { group, span, isRoad(x, z) { const gx = Math.abs(((x / blockSize + 0.5) % 1 + 1) % 1 - 0.5) * blockSize; const gz = Math.abs(((z / blockSize + 0.5) % 1 + 1) % 1 - 0.5) * blockSize; return gx < roadWidth / 2 || gz < roadWidth / 2; }, isWater(x, z) { return x < coastX; }, groundY() { return 0; } };
})(window.SF);
