// Figures face local +Z; all limb pivots live at shoulders/hips, feet at y=0.
import { PALETTE, PLAYER } from './config.js';

const THREE = window.THREE;
const cube = new THREE.BoxGeometry(1, 1, 1);
const surfaces = new Map();
function material(color) {
  if (!surfaces.has(color)) surfaces.set(color, new THREE.MeshStandardMaterial({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.85 }));
  return surfaces.get(color);
}
function part(parent, name, size, position, color) {
  const mesh = new THREE.Mesh(cube, material(color));
  mesh.name = name;
  mesh.scale.set(...size);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createFigure({
  shirtColor = PALETTE.playerShirt,
  skinTone = PALETTE.playerSkin,
  trouserColor = PALETTE.playerPants,
  faceVariant = 'neutral',
} = {}) {
  const figure = new THREE.Group();
  figure.name = 'human-figure';
  const dark = '#251f2a';
  const hair = '#352b30';
  part(figure, 'torso', [0.55, 0.57, 0.32], [0, 1.17, 0], shirtColor);
  part(figure, 'waist', [0.48, 0.15, 0.3], [0, 0.85, 0], trouserColor);
  part(figure, 'neck', [0.17, 0.12, 0.18], [0, 1.46, 0], skinTone);
  const head = new THREE.Group();
  head.name = 'head';
  head.position.y = 1.62;
  figure.add(head);
  // A broad, flat front gives the small, dark facial primitives a clear silhouette.
  part(head, 'head-skin', [0.36, 0.36, 0.32], [0, 0, 0], skinTone);
  part(head, 'hair', [0.38, 0.09, 0.34], [0, 0.15, -0.015], hair);
  part(head, 'hair-back', [0.37, 0.22, 0.07], [0, 0.06, -0.15], hair);
  part(head, 'nose', [0.065, 0.075, 0.055], [0, -0.025, 0.18], skinTone);
  for (const side of [-1, 1]) {
    part(head, 'ear', [0.055, 0.1, 0.09], [side * 0.2, -0.01, 0], skinTone);
    part(head, side < 0 ? 'left-eye' : 'right-eye', [0.058, 0.045, 0.027], [side * 0.085, 0.028, 0.174], dark);
    const brow = part(head, side < 0 ? 'left-brow' : 'right-brow', [0.095, 0.025, 0.025], [side * 0.085, 0.085, 0.178], dark);
    brow.rotation.z = faceVariant === 'stern' ? side * 0.27 : faceVariant === 'smile' ? -side * 0.12 : 0;
    if (faceVariant === 'glasses') {
      for (const y of [0.071, -0.016]) part(head, 'glasses-frame', [0.13, 0.018, 0.025], [side * 0.09, y, 0.196], dark);
      for (const x of [side * 0.09 - 0.06, side * 0.09 + 0.06]) {
        part(head, 'glasses-frame', [0.018, 0.1, 0.025], [x, 0.028, 0.196], dark);
      }
    }
  }
  if (faceVariant === 'glasses') part(head, 'glasses-bridge', [0.055, 0.018, 0.025], [0, 0.04, 0.198], dark);
  const mouth = part(head, 'mouth', [0.13, 0.026, 0.025], [0, -0.105, 0.177], dark);
  if (faceVariant === 'smile') {
    for (const side of [-1, 1]) {
      const corner = part(head, 'smile-corner', [0.06, 0.025, 0.025], [side * 0.072, -0.089, 0.177], dark);
      corner.rotation.z = side * 0.55;
    }
  } else if (faceVariant === 'stern') mouth.scale.x = 0.1;

  const limbs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'left-hip' : 'right-hip';
    leg.position.set(side * 0.145, 0.8, 0);
    part(leg, 'trouser-leg', [0.21, 0.67, 0.24], [0, -0.335, 0], trouserColor);
    part(leg, 'shoe', [0.23, 0.13, 0.36], [0, -0.735, 0.065], dark);
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'left-shoulder' : 'right-shoulder';
    arm.position.set(side * 0.355, 1.39, 0);
    part(arm, 'sleeve', [0.19, 0.23, 0.23], [0, -0.1, 0], shirtColor);
    part(arm, 'forearm', [0.155, 0.32, 0.18], [0, -0.365, 0], skinTone);
    part(arm, 'hand', [0.17, 0.15, 0.19], [0, -0.58, 0], skinTone);
    figure.add(leg, arm);
    limbs.push({ side, leg, arm });
  }
  figure.userData.limbs = limbs;
  figure.userData.faceVariant = faceVariant;
  figure.scale.setScalar(PLAYER.height / 1.8);
  return figure;
}

export function poseWalk(figure, phase, amount = 1) {
  const swing = Math.sin(phase) * 0.6 * THREE.MathUtils.clamp(amount, 0, 1);
  for (const { side, leg, arm } of figure.userData.limbs) {
    leg.rotation.x = side * swing;
    arm.rotation.x = -side * swing * 0.85;
  }
}

export function createPlayerFigure() {
  const figure = createFigure({
    shirtColor: PALETTE.playerShirt,
    skinTone: PALETTE.playerSkin,
    trouserColor: PALETTE.playerPants,
    faceVariant: 'neutral',
  });
  figure.name = 'player';
  return figure;
}
