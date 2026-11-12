// Generates watertight test solids as binary STL.
import { writeFileSync } from 'fs';
type V = [number, number, number];
const tri: Record<string, V[][]> = {};
function write(name: string, t: V[][]) {
  const buf = Buffer.alloc(84 + t.length * 50);
  buf.writeUInt32LE(t.length, 80);
  t.forEach((f, i) => {
    let o = 84 + i * 50 + 12;
    for (const v of f)
      for (const c of v) {
        buf.writeFloatLE(c, o);
        o += 4;
      }
  });
  writeFileSync(`${process.argv[2]}/${name}.stl`, buf);
}
// ear clipping for simple CCW polygon
function earclip(poly: [number, number][]): number[][] {
  const idx = poly.map((_, i) => i);
  const out: number[][] = [];
  const cross = (a: number, b: number, c: number) =>
    (poly[b][0] - poly[a][0]) * (poly[c][1] - poly[a][1]) -
    (poly[b][1] - poly[a][1]) * (poly[c][0] - poly[a][0]);
  const inside = (p: number, a: number, b: number, c: number) =>
    cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    for (let i = 0; i < idx.length; i++) {
      const a = idx[(i + idx.length - 1) % idx.length],
        b = idx[i],
        c = idx[(i + 1) % idx.length];
      if (cross(a, b, c) <= 0) continue;
      if (idx.some((p) => p !== a && p !== b && p !== c && inside(p, a, b, c))) continue;
      out.push([a, b, c]);
      idx.splice(i, 1);
      break;
    }
  }
  out.push([idx[0], idx[1], idx[2]]);
  return out;
}
// extrude CCW polygon in XZ plane along Y (so the profile stands up), or XY along Z
function extrude(poly: [number, number][], depth: number, standing: boolean): V[][] {
  const P = (p: [number, number], d: number): V => (standing ? [p[0], d, p[1]] : [p[0], p[1], d]);
  const t: V[][] = [];
  const caps = earclip(poly);
  const flipA = standing; // keep outward normals
  for (const [a, b, c] of caps) {
    const lo: V[] = [P(poly[a], 0), P(poly[c], 0), P(poly[b], 0)],
      hi: V[] = [P(poly[a], depth), P(poly[b], depth), P(poly[c], depth)];
    t.push(flipA ? [lo[0], lo[2], lo[1]] : lo, flipA ? [hi[0], hi[2], hi[1]] : hi);
  }
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i],
      q = poly[(i + 1) % poly.length];
    const a = P(p, 0),
      b = P(q, 0),
      c = P(q, depth),
      d = P(p, depth);
    if (flipA) t.push([a, c, b], [a, d, c]);
    else t.push([a, b, c], [a, c, d]);
  }
  return t;
}
// lathe closed CCW profile (r,z) around Z
function lathe(profile: [number, number][], seg = 96): V[][] {
  const t: V[][] = [];
  for (let s = 0; s < seg; s++) {
    const a0 = (2 * Math.PI * s) / seg,
      a1 = (2 * Math.PI * (s + 1)) / seg;
    for (let i = 0; i < profile.length; i++) {
      const [r0, z0] = profile[i],
        [r1, z1] = profile[(i + 1) % profile.length];
      const A: V = [r0 * Math.cos(a0), r0 * Math.sin(a0), z0],
        B: V = [r0 * Math.cos(a1), r0 * Math.sin(a1), z0];
      const C: V = [r1 * Math.cos(a1), r1 * Math.sin(a1), z1],
        D: V = [r1 * Math.cos(a0), r1 * Math.sin(a0), z1];
      if (r0 > 0) t.push([A, B, C]);
      if (r1 > 0) t.push([A, C, D]);
    }
  }
  return t;
}
const rect = (w: number, h: number): [number, number][] => [
  [0, 0],
  [w, 0],
  [w, h],
  [0, h],
];
write('cube20', extrude(rect(20, 20), 20, false));
write('cube46', extrude(rect(46.4, 46.4), 46.4, false));
write('block120x80x40', extrude(rect(120, 80), 40, false));
write('plate100x60x2', extrude(rect(100, 60), 2, false));
write('plate150x100x4', extrude(rect(150, 100), 4, false));
write(
  'cyl30x50',
  lathe([
    [0, 0],
    [15, 0],
    [15, 50],
    [0, 50],
  ])
);
write(
  'cyl80x20',
  lathe([
    [0, 0],
    [40, 0],
    [40, 20],
    [0, 20],
  ])
);
write(
  'cup60',
  lathe([
    [0, 0],
    [30, 0],
    [30, 70],
    [28, 70],
    [28, 2],
    [0, 2],
  ])
);
const sph: [number, number][] = [];
for (let i = 0; i <= 32; i++) {
  const a = -Math.PI / 2 + (Math.PI * i) / 32;
  sph.push([20 * Math.cos(a), 20 + 20 * Math.sin(a)]);
}
write('sphere40', lathe(sph));
// T standing: stem 10 wide 40 tall, top bar 60 wide 10 thick -> overhangs
write(
  'T_standing',
  extrude(
    [
      [25, 0],
      [35, 0],
      [35, 40],
      [60, 40],
      [60, 50],
      [0, 50],
      [0, 40],
      [25, 40],
    ],
    20,
    true
  )
);
// table: top 80x8 on two legs 8 wide 40 tall -> bridge/overhang
write(
  'table',
  extrude(
    [
      [0, 0],
      [8, 0],
      [8, 40],
      [72, 40],
      [72, 0],
      [80, 0],
      [80, 48],
      [0, 48],
    ],
    50,
    true
  )
);
// L bracket lying: no supports
write(
  'L_bracket',
  extrude(
    [
      [0, 0],
      [60, 0],
      [60, 5],
      [5, 5],
      [5, 40],
      [0, 40],
    ],
    30,
    true
  )
);
// knob-like: small cylinder d16 h14 with bore (lathe ring)
write(
  'knob',
  lathe(
    [
      [3, 0],
      [8, 0],
      [8, 14],
      [0, 14],
      [0, 10],
      [3, 10],
    ],
    64
  )
);
write(
  'mushroom',
  lathe([
    [0, 0],
    [5, 0],
    [5, 30],
    [25, 30],
    [25, 35],
    [0, 35],
  ])
);
write(
  'arch',
  extrude(
    [
      [0, 0],
      [10, 0],
      [10, 30],
      [50, 30],
      [50, 0],
      [60, 0],
      [60, 40],
      [0, 40],
    ],
    30,
    true
  )
);
