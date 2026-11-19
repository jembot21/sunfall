(function () {
  var group = new THREE.Group();
  var size = 1400;
  var half = size / 2;
  var canvas = document.createElement('canvas');
  canvas.width = canvas.height = 2048;
  var ctx = canvas.getContext('2d');
  var scale = canvas.width / size;
  function px(x) { return (x + half) * scale; }
  function pz(z) { return (z + half) * scale; }
  ctx.fillStyle = '#b6a7a2'; ctx.fillRect(0, 0, 2048, 2048);
  ctx.fillStyle = '#33323e';
  for (var k = -7; k <= 7; k++) {
    var roadCenter = k * 82 + 41;
    ctx.fillRect(px(roadCenter - 9), 0, 18 * scale, 2048);
    ctx.fillRect(0, pz(roadCenter - 9), 2048, 18 * scale);
  }
  var lotColors = ['#837987','#8c7773','#766f81','#9a8071','#747a80','#8a7c8b','#9b827b'];
  for (var gx = -3; gx <= 3; gx++) for (var gz = -3; gz <= 3; gz++) {
    var cx = gx * 82, cz = gz * 82;
    ctx.fillStyle = lotColors[(gx * 3 + gz * 5 + 30) % lotColors.length];
    ctx.fillRect(px(cx - 31), pz(cz - 31), 62 * scale, 62 * scale);
    ctx.fillStyle = '#c6aaa0';
    ctx.fillRect(px(cx - 33), pz(cz - 33), 66 * scale, 2 * scale);
    ctx.fillRect(px(cx - 33), pz(cz + 31), 66 * scale, 2 * scale);
  }
  ctx.fillStyle = '#e8c07a'; ctx.fillRect(0, 0, px(-260), 2048);
  ctx.fillStyle = '#b9977e'; ctx.fillRect(px(-276), 0, 16 * scale, 2048);
  ctx.fillStyle = '#33323e'; ctx.fillRect(px(-245), 0, 18 * scale, 2048);
  ctx.strokeStyle = '#e6d8ad'; ctx.lineWidth = 2;
  for (var r = -7; r <= 7; r++) {
    var center = r * 82;
    ctx.setLineDash([12, 14]);
    ctx.beginPath(); ctx.moveTo(px(center), 0); ctx.lineTo(px(center), 2048); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pz(center)); ctx.lineTo(2048, pz(center)); ctx.stroke();
  }
  ctx.setLineDash([]);
  var texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.anisotropy = 4;
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: texture }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.08; ground.receiveShadow = true;
  group.add(ground);

  var oceanMat1 = new THREE.MeshLambertMaterial({ color: '#318d9e', transparent: true, opacity: 0.8, depthWrite: false });
  var oceanMat2 = new THREE.MeshLambertMaterial({ color: '#57bac0', transparent: true, opacity: 0.26, depthWrite: false });
  var ocean1 = new THREE.Mesh(new THREE.PlaneGeometry(700, 1200), oceanMat1);
  var ocean2 = new THREE.Mesh(new THREE.PlaneGeometry(700, 1200), oceanMat2);
  ocean1.rotation.x = ocean2.rotation.x = -Math.PI / 2;
  ocean1.position.set(-740, -0.16, 0); ocean2.position.set(-740, -0.11, 0);
  group.add(ocean1, ocean2);

  var umbrellaGeo = new THREE.ConeGeometry(2.3, 1.1, 8, 1);
  var umbrellaMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.78 });
  var towelsMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: THREE.DoubleSide });
  var umbrellaCount = 60, umbrellas = new THREE.InstancedMesh(umbrellaGeo, umbrellaMat, umbrellaCount);
  var towelGeo = new THREE.PlaneGeometry(4, 6);
  var towels = new THREE.InstancedMesh(towelGeo, towelsMat, umbrellaCount);
  var dummy = new THREE.Object3D();
  var beachColors = ['#ff5a70','#ffd34f','#32c5b4','#a978ff','#ffffff'];
  for (var u = 0; u < umbrellaCount; u++) {
    var bx = -345 - (u % 5) * 15;
    var bz = -215 + Math.floor(u / 5) * 38;
    dummy.position.set(bx, 1.1, bz); dummy.rotation.set(0, (u * 1.7) % 6.2, 0); dummy.updateMatrix(); umbrellas.setMatrixAt(u, dummy.matrix);
    umbrellas.setColorAt(u, new THREE.Color(beachColors[u % beachColors.length]));
    dummy.position.set(bx + 4, 0.12, bz + 5); dummy.rotation.set(-Math.PI / 2, 0, (u % 2) * 0.28); dummy.updateMatrix(); towels.setMatrixAt(u, dummy.matrix);
    towels.setColorAt(u, new THREE.Color(beachColors[(u + 2) % beachColors.length]));
  }
  umbrellas.castShadow = true; group.add(umbrellas, towels);
  var pier = new THREE.Group();
  var pierMat = new THREE.MeshStandardMaterial({ color: '#8e6049', roughness: 0.92 });
  var deck = new THREE.Mesh(new THREE.BoxGeometry(80, 1.2, 14), pierMat); deck.position.set(-385, 1, 30); pier.add(deck);
  var postGeo = new THREE.CylinderGeometry(0.6, 0.8, 7, 6);
  for (var p = 0; p < 10; p++) { var post = new THREE.Mesh(postGeo, pierMat); post.position.set(-420 + p * 8, -2.1, 24); pier.add(post); var post2 = post.clone(); post2.position.z = 36; pier.add(post2); }
  group.add(pier);
  SF.render.scene.add(group);
  function districtAt(x, z) {
    var areas = SF.CONFIG.districts;
    for (var i = 0; i < areas.length; i++) { var d = areas[i]; if (x >= d.x1 && x < d.x2 && z >= d.z1 && z < d.z2) return d.name; }
    return x < -260 ? 'Palma Strand' : 'Downtown';
  }
  SF.world = {
    group: group,
    isRoad: function (x, z) {
      var halfRoad = SF.CONFIG.grid.road / 2;
      var modX = ((x % 82) + 82) % 82, modZ = ((z % 82) + 82) % 82;
      return Math.abs(modX - 41) < halfRoad || Math.abs(modZ - 41) < halfRoad;
    },
    isWater: function (x, z) { return x < -390; },
    groundY: function (x, z) { return x < -390 ? -0.35 : 0; },
    districtAt: districtAt,
    update: function (dt) { ocean1.position.z = Math.sin(performance.now() * 0.00023) * 1.3; ocean2.position.z = ocean1.position.z + Math.sin(performance.now() * 0.00031) * 1.1; }
  };
}());
