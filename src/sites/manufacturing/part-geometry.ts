import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// The demo part: a flanged wheel hub, the kind of turned-and-milled component
// Chakan's auto suppliers make every day. 1 scene unit = 50 mm, so the flange is
// Ø 150, the bore Ø 46 and the bolt circle PCD 108.

const SEG = 160;

export const DIM = {
  flangeR: 1.5,
  boreR: 0.46,
  pcdR: 1.08,
  holeR: 0.13,
  holes: 6,
  flangeTop: 0.2,
} as const;

/** The flange disc, with or without its bolt holes (holes appear at the milling stage). */
export function flangeGeometry(withHoles: boolean) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, DIM.flangeR, 0, Math.PI * 2, false);
  const bore = new THREE.Path();
  bore.absarc(0, 0, DIM.boreR, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  if (withHoles) {
    for (let i = 0; i < DIM.holes; i++) {
      const a = (i / DIM.holes) * Math.PI * 2 + Math.PI / 6;
      const p = new THREE.Path();
      p.absarc(Math.cos(a) * DIM.pcdR, Math.sin(a) * DIM.pcdR, DIM.holeR, 0, Math.PI * 2, true);
      shape.holes.push(p);
    }
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: DIM.flangeTop,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: SEG,
  });
  // The shape is drawn in XY and extruded along Z; stand it up so the part's axis is Y.
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * The turned hub: built band by band from a lathe profile, so every shoulder and
 * chamfer keeps a crisp edge instead of LatheGeometry's averaged normals.
 * Points are [radius, height].
 */
export function hubGeometry() {
  const profile: [number, number][] = [
    [0.46, -0.28], [0.64, -0.28], [0.7, -0.22], [0.7, -0.02],
    [0.8, 0.24], [0.8, 0.5], [0.76, 0.54], [0.66, 0.54], [0.66, 0.58], [0.63, 0.61],
    [0.63, 0.82], [0.6, 0.85], [0.63, 0.88], [0.63, 1.12], [0.58, 1.17], [0.5, 1.17], [0.46, 1.13],
    [0.46, -0.28],
  ];
  const bands: THREE.BufferGeometry[] = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const [r1, y1] = profile[i];
    const [r2, y2] = profile[i + 1];
    if (r1 === r2 && y1 === y2) continue;
    const band = new THREE.LatheGeometry([new THREE.Vector2(r1, y1), new THREE.Vector2(r2, y2)], SEG);
    bands.push(band.toNonIndexed());
  }
  const merged = mergeGeometries(bands);
  merged.computeBoundingSphere();
  return merged;
}

/** Bar stock the part is cut from. */
export function barGeometry() {
  const g = new THREE.CylinderGeometry(1.62, 1.62, 1.66, SEG, 1);
  g.translate(0, 0.45, 0);
  return g;
}

export const BAR = { top: 1.28, bottom: -0.38, r: 1.62 } as const;

/** Fine turning marks: horizontal stripes of varying roughness along each band. */
export function turnedRoughnessMap() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < 256; y++) {
    const v = 120 + Math.round(Math.sin(y * 1.7) * 30 + (Math.random() - 0.5) * 50);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, 4, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 6);
  return t;
}

/** Concentric facing marks for the flange's flat faces. */
export function facedRoughnessMap() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      const r = Math.sqrt(dx * dx + dy * dy);
      const v = 115 + Math.sin(r * 2.1) * 28 + Math.sin(r * 0.37) * 18;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  // Extruded caps use the shape's own XY coordinates (−1.5…1.5) as UVs.
  t.repeat.set(1 / 3, 1 / 3);
  t.offset.set(0.5, 0.5);
  return t;
}
