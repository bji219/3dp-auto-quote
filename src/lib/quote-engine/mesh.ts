/**
 * STL reading and geometric analysis. Pure TypeScript with no DOM or Node
 * dependencies, so the same code runs in the browser and on the server.
 */

export class StlError extends Error {}

/** Flat triangle soup: 9 floats per triangle (x,y,z for each of 3 vertices), mm. */
export type Triangles = Float32Array;

const ASCII_VERTEX = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g;

function looksBinary(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 84) return false;
  const count = new DataView(buf).getUint32(80, true);
  if (count === 0) return false;
  const expected = 84 + count * 50;
  // Exact match is the normal case. Some exporters append padding or metadata.
  return (
    expected === buf.byteLength || (expected < buf.byteLength && buf.byteLength - expected < 1024)
  );
}

function parseBinary(buf: ArrayBuffer): Triangles {
  const view = new DataView(buf);
  const count = view.getUint32(80, true);
  const out = new Float32Array(count * 9);
  let kept = 0;
  for (let i = 0; i < count; i++) {
    const base = 84 + i * 50 + 12; // skip the stored normal; many files have it wrong
    let ok = true;
    for (let j = 0; j < 9; j++) {
      const v = view.getFloat32(base + j * 4, true);
      if (!Number.isFinite(v)) {
        ok = false;
        break;
      }
      out[kept * 9 + j] = v;
    }
    if (ok) kept++;
  }
  return kept === count ? out : out.slice(0, kept * 9);
}

function parseAscii(buf: ArrayBuffer): Triangles {
  const text = new TextDecoder('utf-8').decode(buf);
  const values: number[] = [];
  ASCII_VERTEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ASCII_VERTEX.exec(text)) !== null) {
    values.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  const whole = Math.floor(values.length / 9) * 9;
  const out = new Float32Array(whole);
  let kept = 0;
  for (let i = 0; i < whole; i += 9) {
    let ok = true;
    for (let j = 0; j < 9; j++) if (!Number.isFinite(values[i + j])) ok = false;
    if (!ok) continue;
    for (let j = 0; j < 9; j++) out[kept * 9 + j] = values[i + j];
    kept++;
  }
  return kept * 9 === whole ? out : out.slice(0, kept * 9);
}

/** Read a binary or ASCII STL. Throws StlError with a message fit to show a customer. */
export function parseStl(buf: ArrayBuffer): Triangles {
  if (!buf || buf.byteLength === 0) throw new StlError('The file is empty.');
  if (buf.byteLength < 84) throw new StlError('The file is too small to be an STL.');

  let tris: Triangles;
  if (looksBinary(buf)) {
    tris = parseBinary(buf);
  } else {
    tris = parseAscii(buf);
    if (tris.length === 0) {
      // Not ASCII either. Last resort: a truncated binary file.
      const claimed = new DataView(buf).getUint32(80, true);
      const available = Math.floor((buf.byteLength - 84) / 50);
      // Only when most of the file is there; otherwise it is not an STL at all.
      if (available > 0 && available < claimed && available >= claimed / 2) {
        const header = buf.slice(0, 84);
        new DataView(header).setUint32(80, available, true);
        const fixed = new Uint8Array(84 + available * 50);
        fixed.set(new Uint8Array(header), 0);
        fixed.set(new Uint8Array(buf, 84, available * 50), 84);
        tris = parseBinary(fixed.buffer);
      }
    }
  }
  if (tris.length === 0) {
    throw new StlError(
      'No triangles found. This does not look like an STL file. If it is a STEP, OBJ or 3MF, export it as STL first.'
    );
  }
  return tris;
}

export type Axis = 0 | 1 | 2;

export interface Orientation {
  /** Which model axis points up, and in which direction. */
  axis: Axis;
  sign: 1 | -1;
  label: string;
  /** Height on the build plate, mm. */
  height: number;
  /** Footprint on the plate, mm. */
  footprint: [number, number];
  /** Area of side-facing surface: what the walls trace, mm². */
  lateralArea: number;
  /** Plan-view area of up-facing and down-facing surface, mm². */
  topArea: number;
  bottomArea: number;
  /** Plan-view area of faces overhanging past the support threshold, mm². */
  overhangArea: number;
  /** Volume between those faces and the bed, mm³. An upper bound on the supported region. */
  supportColumn: number;
  /** Area sitting flat on the bed, mm². */
  bedContact: number;
}

export interface MeshAnalysis {
  triangles: number;
  /** mm³, always positive */
  volume: number;
  /** mm² */
  area: number;
  size: [number, number, number];
  /**
   * 0 for a perfectly closed surface. Above ~0.02 the mesh has holes and the
   * volume (so the price) is unreliable.
   */
  openness: number;
  /** Normals point inward (volume came out negative). Harmless; slicers fix it. */
  inverted: boolean;
  orientations: Orientation[];
}

const LABELS = ['+X up', '−X up', '+Y up', '−Y up', 'as uploaded', 'flipped over'];

/**
 * Measure a mesh. `overhangAngle` is degrees from vertical beyond which a
 * down-facing surface is treated as needing support.
 */
export function analyzeMesh(tris: Triangles, overhangAngle = 45): MeshAnalysis {
  const n = tris.length / 9;
  if (n === 0) throw new StlError('The mesh has no triangles.');

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < tris.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      const v = tris[i + a];
      if (v < min[a]) min[a] = v;
      if (v > max[a]) max[a] = v;
    }
  }
  const size: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  // Measure volume about the centre of the box: keeps float error down for
  // parts modelled far from the origin.
  const c = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];

  const threshold = Math.sin((overhangAngle * Math.PI) / 180); // n·down above this needs support
  const bedTol = Math.max(0.05, Math.max(size[0], size[1], size[2]) * 1e-4);

  const lateral = new Float64Array(6);
  const top = new Float64Array(6);
  const bottom = new Float64Array(6);
  const overhang = new Float64Array(6);
  const column = new Float64Array(6);
  const contact = new Float64Array(6);

  // Pre-pass: signed volume tells us whether the normals point inward, which
  // would swap every "up-facing" and "down-facing" measurement below.
  let vol6 = 0;
  for (let o = 0; o < tris.length; o += 9) {
    const ax = tris[o] - c[0],
      ay = tris[o + 1] - c[1],
      az = tris[o + 2] - c[2];
    const bx = tris[o + 3] - c[0],
      by = tris[o + 4] - c[1],
      bz = tris[o + 5] - c[2];
    const cx = tris[o + 6] - c[0],
      cy = tris[o + 7] - c[1],
      cz = tris[o + 8] - c[2];
    vol6 += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  const signed = vol6 / 6;
  const inverted = signed < 0;
  const flip = inverted ? -1 : 1;

  let area = 0;
  let sx = 0,
    sy = 0,
    sz = 0;

  for (let t = 0; t < n; t++) {
    const o = t * 9;
    const ax = tris[o] - c[0],
      ay = tris[o + 1] - c[1],
      az = tris[o + 2] - c[2];
    const bx = tris[o + 3] - c[0],
      by = tris[o + 4] - c[1],
      bz = tris[o + 5] - c[2];
    const cx = tris[o + 6] - c[0],
      cy = tris[o + 7] - c[1],
      cz = tris[o + 8] - c[2];

    // 2 * area vector
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const twice = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (twice === 0) continue;
    const a = twice / 2;
    area += a;
    sx += nx;
    sy += ny;
    sz += nz;

    const unit = [(flip * nx) / twice, (flip * ny) / twice, (flip * nz) / twice];
    const cen = [(ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3];
    const lo = [Math.min(ax, bx, cx), Math.min(ay, by, cy), Math.min(az, bz, cz)];
    const hi = [Math.max(ax, bx, cx), Math.max(ay, by, cy), Math.max(az, bz, cz)];

    for (let axis = 0; axis < 3; axis++) {
      const half = size[axis] / 2;
      const comp = unit[axis];
      const side = a * Math.sqrt(Math.max(0, 1 - comp * comp));
      const plan = a * Math.abs(comp);
      for (let s = 0; s < 2; s++) {
        const k = axis * 2 + s;
        const up = s === 0 ? comp : -comp; // normal's component along "up"
        lateral[k] += side;
        if (up > 0) {
          top[k] += plan;
          continue;
        }
        bottom[k] += plan;
        // Height of this face above the bed, for this orientation.
        const h = s === 0 ? cen[axis] + half : half - cen[axis];
        const lowest = s === 0 ? lo[axis] + half : half - hi[axis];
        const highest = s === 0 ? hi[axis] + half : half - lo[axis];
        if (highest <= bedTol) {
          contact[k] += plan;
        } else if (-up > threshold && lowest > bedTol) {
          overhang[k] += plan;
          column[k] += plan * h;
        }
      }
    }
  }

  if (area === 0) throw new StlError('Every triangle in the mesh is degenerate (zero area).');
  const openness = Math.sqrt(sx * sx + sy * sy + sz * sz) / 2 / area;

  const orientations: Orientation[] = [];
  for (let axis = 0 as Axis; axis < 3; axis = (axis + 1) as Axis) {
    const others = [0, 1, 2].filter((x) => x !== axis);
    for (let s = 0; s < 2; s++) {
      const k = axis * 2 + s;
      orientations.push({
        axis,
        sign: s === 0 ? 1 : -1,
        label: LABELS[k],
        height: size[axis],
        footprint: [size[others[0]], size[others[1]]],
        lateralArea: lateral[k],
        topArea: top[k],
        bottomArea: bottom[k],
        overhangArea: overhang[k],
        supportColumn: column[k],
        bedContact: contact[k],
      });
    }
  }

  return { triangles: n, volume: Math.abs(signed), area, size, openness, inverted, orientations };
}

/** Re-express an analysis in different units, e.g. 25.4 for a file drawn in inches. */
export function scaleAnalysis(a: MeshAnalysis, s: number): MeshAnalysis {
  if (s === 1) return a;
  const s2 = s * s;
  const s3 = s2 * s;
  return {
    ...a,
    volume: a.volume * s3,
    area: a.area * s2,
    size: [a.size[0] * s, a.size[1] * s, a.size[2] * s],
    orientations: a.orientations.map((o) => ({
      ...o,
      height: o.height * s,
      footprint: [o.footprint[0] * s, o.footprint[1] * s],
      lateralArea: o.lateralArea * s2,
      topArea: o.topArea * s2,
      bottomArea: o.bottomArea * s2,
      overhangArea: o.overhangArea * s2,
      supportColumn: o.supportColumn * s3,
      bedContact: o.bedContact * s2,
    })),
  };
}

/**
 * Build an approximate analysis when only volume, area and bounding box are
 * known (manual entry, or records saved before the mesh was analysed).
 * Assumes no supports and splits the surface by the box's proportions.
 */
export function analysisFromSummary(
  volume: number,
  area: number,
  size: [number, number, number]
): MeshAnalysis {
  const [x, y, z] = size;
  const boxArea = 2 * (x * y + y * z + x * z) || 1;
  const orientations: Orientation[] = [];
  for (let axis = 0 as Axis; axis < 3; axis = (axis + 1) as Axis) {
    const others = [0, 1, 2].filter((k) => k !== axis);
    const plan = size[others[0]] * size[others[1]];
    const planShare = plan / boxArea;
    for (let s = 0; s < 2; s++) {
      orientations.push({
        axis,
        sign: s === 0 ? 1 : -1,
        label: LABELS[axis * 2 + s],
        height: size[axis],
        footprint: [size[others[0]], size[others[1]]],
        lateralArea: area * (1 - 2 * planShare),
        topArea: area * planShare,
        bottomArea: area * planShare,
        overhangArea: 0,
        supportColumn: 0,
        bedContact: area * planShare,
      });
    }
  }
  return { triangles: 0, volume, area, size, openness: 0, inverted: false, orientations };
}
