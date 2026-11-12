import {
  generateASCIISTLCube,
  generateBinarySTLCube,
} from '@/utils/__tests__/fixtures/stl-generators';
import {
  CLASSIC,
  PUBLIC_PRICING,
  StlError,
  analysisFromSummary,
  analyzeMesh,
  buildQuote,
  costJob,
  defaultJobInputs,
  estimatePrint,
  parseStl,
  pricePublic,
  quoteFromStl,
  scaleAnalysis,
} from '..';
import { parseSTL, validateSTLData } from '@/utils/stl-parser';
import { calculateDetailedQuote, decodeQuoteMeta, encodeQuoteMeta } from '@/utils/pricing';

type V = [number, number, number];

function stl(tris: V[][]): ArrayBuffer {
  const buf = new ArrayBuffer(84 + tris.length * 50);
  const view = new DataView(buf);
  view.setUint32(80, tris.length, true);
  tris.forEach((t, i) => {
    let o = 84 + i * 50 + 12;
    for (const v of t) for (const c of v) (view.setFloat32(o, c, true), (o += 4));
  });
  return buf;
}

/** Axis-aligned box with outward normals, min corner at `at`. */
function box(w: number, d: number, h: number, at: V = [0, 0, 0]): V[][] {
  const [x, y, z] = at;
  const p: V[] = [
    [x, y, z],
    [x + w, y, z],
    [x + w, y + d, z],
    [x, y + d, z],
    [x, y, z + h],
    [x + w, y, z + h],
    [x + w, y + d, z + h],
    [x, y + d, z + h],
  ];
  const q = (a: number, b: number, c: number, e: number): V[][] => [
    [p[a], p[b], p[c]],
    [p[a], p[c], p[e]],
  ];
  return [
    ...q(0, 3, 2, 1),
    ...q(4, 5, 6, 7),
    ...q(0, 1, 5, 4),
    ...q(1, 2, 6, 5),
    ...q(2, 3, 7, 6),
    ...q(3, 0, 4, 7),
  ];
}

/** A table: 80x50x8 top on two 8 mm legs, 40 mm tall. Big overhang as uploaded. */
const table = () =>
  stl([...box(80, 50, 8, [0, 0, 40]), ...box(8, 50, 40, [0, 0, 0]), ...box(8, 50, 40, [72, 0, 0])]);

const settings = { material: 'PLA', quality: 'standard', infill: 15 } as const;

describe('parseStl', () => {
  it('reads binary and ASCII cubes identically', () => {
    const b = analyzeMesh(parseStl(generateBinarySTLCube(20)));
    const a = analyzeMesh(parseStl(generateASCIISTLCube(20)));
    expect(b.triangles).toBe(12);
    expect(a.triangles).toBe(12);
    expect(b.volume).toBeCloseTo(8000, 3);
    expect(a.volume).toBeCloseTo(8000, 3);
    expect(b.area).toBeCloseTo(2400, 3);
  });

  it('treats a binary file whose header starts with "solid" as binary', () => {
    const buf = generateBinarySTLCube(10);
    new Uint8Array(buf).set(new TextEncoder().encode('solid exported-by-cad'), 0);
    expect(parseStl(buf).length).toBe(12 * 9);
  });

  it('handles CRLF line endings and multiple solids in ASCII', () => {
    const one = new TextDecoder().decode(generateASCIISTLCube(10)).replace(/\n/g, '\r\n');
    const both = new TextEncoder().encode(one + one).buffer as ArrayBuffer;
    expect(parseStl(both).length).toBe(24 * 9);
  });

  it('recovers the triangles present in a truncated binary file', () => {
    const full = generateBinarySTLCube(10);
    const cut = full.slice(0, 84 + 7 * 50 + 20);
    expect(parseStl(cut).length).toBe(7 * 9);
  });

  it('rejects junk with a readable message', () => {
    expect(() => parseStl(new ArrayBuffer(0))).toThrow(StlError);
    expect(() => parseStl(new ArrayBuffer(84))).toThrow(/No triangles/);
    expect(() => parseStl(new TextEncoder().encode('x'.repeat(200)).buffer as ArrayBuffer)).toThrow(
      /STL/
    );
  });
});

describe('analyzeMesh', () => {
  it('is independent of where the part sits in space', () => {
    const near = analyzeMesh(parseStl(stl(box(30, 20, 10))));
    const far = analyzeMesh(parseStl(stl(box(30, 20, 10, [5000, -3000, 900]))));
    expect(far.volume).toBeCloseTo(near.volume, 0);
    expect(far.size).toEqual(near.size);
  });

  it('corrects inside-out normals', () => {
    const flipped = box(20, 20, 20).map(([a, b, c]) => [a, c, b] as V[]);
    const m = analyzeMesh(parseStl(stl(flipped)));
    expect(m.inverted).toBe(true);
    expect(m.volume).toBeCloseTo(8000, 2);
    // Resting on the bed, nothing overhanging, in every orientation.
    for (const o of m.orientations) {
      expect(o.bedContact).toBeCloseTo(400, 2);
      expect(o.overhangArea).toBe(0);
    }
  });

  it('flags an open mesh', () => {
    const open = box(20, 20, 20).slice(2); // remove the bottom face
    expect(analyzeMesh(parseStl(stl(open))).openness).toBeGreaterThan(0.02);
    expect(analyzeMesh(parseStl(stl(box(20, 20, 20)))).openness).toBeLessThan(1e-6);
  });

  it('measures overhangs per orientation', () => {
    const m = analyzeMesh(parseStl(table()));
    const asUploaded = m.orientations[4];
    const flipped = m.orientations[5];
    // The fixture is three stacked boxes, so the whole underside of the top
    // counts (the 16 mm over the legs is a coincident face).
    expect(asUploaded.overhangArea).toBeCloseTo(80 * 50, 0);
    expect(asUploaded.supportColumn).toBeCloseTo(80 * 50 * 40, 0);
    expect(flipped.overhangArea).toBeLessThan(asUploaded.overhangArea / 4);
  });

  it('scales like geometry', () => {
    const m = analyzeMesh(parseStl(stl(box(1, 2, 3))));
    const inch = scaleAnalysis(m, 25.4);
    expect(inch.size[2]).toBeCloseTo(76.2, 3);
    expect(inch.volume).toBeCloseTo(6 * 25.4 ** 3, 0);
    expect(inch.area).toBeCloseTo(22 * 25.4 ** 2, 0);
  });
});

describe('estimatePrint', () => {
  const cube = analyzeMesh(parseStl(stl(box(46.4, 46.4, 46.4))));

  it('lands near slicer output for a 100 cm³ cube (PrusaSlicer: 24.9 cm³, 39 min)', () => {
    const e = estimatePrint(cube, { ...settings, orientation: 4 });
    expect(e.volume.total / 1000).toBeGreaterThan(24.9 * 0.9);
    expect(e.volume.total / 1000).toBeLessThan(24.9 * 1.1);
    expect(e.hours * 60).toBeGreaterThan(39 * 0.85);
    expect(e.hours * 60).toBeLessThan(39 * 1.15);
  });

  it('never extrudes more than the solid, even for thin parts', () => {
    const plate = analyzeMesh(parseStl(stl(box(100, 60, 1.2))));
    const e = estimatePrint(plate, { ...settings, infill: 100, orientation: 4 });
    expect(e.volume.total).toBeLessThanOrEqual(plate.volume);
    expect(e.volume.total).toBeGreaterThan(plate.volume * 0.85);
  });

  it('responds in the right direction to each setting', () => {
    const base = estimatePrint(cube, settings);
    expect(estimatePrint(cube, { ...settings, infill: 60 }).grams).toBeGreaterThan(base.grams);
    expect(estimatePrint(cube, { ...settings, quality: 'high' }).hours).toBeGreaterThan(base.hours);
    expect(estimatePrint(cube, { ...settings, quality: 'draft' }).hours).toBeLessThan(base.hours);
    expect(estimatePrint(cube, { ...settings, material: 'TPU' }).hours).toBeGreaterThan(
      base.hours * 2
    );
    expect(estimatePrint(cube, { ...settings, printer: CLASSIC }).hours).toBeGreaterThan(
      base.hours * 1.5
    );
  });

  it('auto-orients to avoid supports', () => {
    const m = analyzeMesh(parseStl(table()));
    expect(estimatePrint(m, { ...settings, orientation: 4 }).needsSupport).toBe(true);
    const auto = estimatePrint(m, settings);
    expect(auto.needsSupport).toBe(false);
    expect(auto.grams).toBeLessThan(estimatePrint(m, { ...settings, orientation: 4 }).grams);
  });

  it('stands a long part up only if that is the only way it fits', () => {
    const rod = analyzeMesh(parseStl(stl(box(20, 20, 300))));
    const e = estimatePrint(rod, settings);
    expect(e.fitsPrinter).toBe(false);
    const ok = analyzeMesh(parseStl(stl(box(20, 20, 250))));
    expect(estimatePrint(ok, settings).fitsPrinter).toBe(true);
  });
});

describe('pricePublic', () => {
  const cube = analyzeMesh(parseStl(stl(box(46.4, 46.4, 46.4))));
  const est = estimatePrint(cube, settings);

  it('adds up', () => {
    const p = pricePublic(est, { material: 'PLA', quantity: 3, rush: true });
    const goods = p.setupFee + p.partsTotal - p.discount + p.minimumAdjustment;
    expect(p.total).toBeCloseTo(goods + p.rushFee + p.shipping + p.tax, 1);
    expect(p.partsTotal).toBeCloseTo(p.unitPrice * 3, 1);
  });

  it('applies the minimum order to tiny parts', () => {
    const tiny = estimatePrint(analyzeMesh(parseStl(stl(box(8, 8, 8)))), settings);
    const p = pricePublic(tiny, { material: 'PLA', shipping: false });
    expect(p.minimumAdjustment).toBeGreaterThan(0);
    expect(p.total).toBeCloseTo(PUBLIC_PRICING.minimumOrder, 2);
  });

  it('discounts quantity and never makes more parts cheaper in total', () => {
    let last = 0;
    for (const q of [1, 4, 5, 9, 10, 24, 25, 49, 50, 100]) {
      const p = pricePublic(est, { material: 'PLA', quantity: q, shipping: false });
      expect(p.total).toBeGreaterThanOrEqual(last);
      last = p.total;
    }
    expect(pricePublic(est, { material: 'PLA', quantity: 10 }).discountPercent).toBe(10);
  });

  it('waives shipping over the threshold', () => {
    const p = pricePublic(est, { material: 'PLA', quantity: 20 });
    expect(p.freeShipping).toBe(true);
    expect(p.shipping).toBe(0);
  });

  it('clamps silly quantities', () => {
    expect(pricePublic(est, { material: 'PLA', quantity: -4 }).quantity).toBe(1);
    expect(pricePublic(est, { material: 'PLA', quantity: 1e9 }).quantity).toBe(
      PUBLIC_PRICING.maxQuantity
    );
  });
});

describe('buildQuote warnings', () => {
  const q = (tris: V[][], opts = {}) => buildQuote(analyzeMesh(parseStl(stl(tris))), opts);

  it('quotes an ordinary part cleanly', () => {
    const r = q(box(40, 30, 20));
    expect(r.orderable).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it('suspects inches for a tiny model, and the unit switch clears it', () => {
    const r = q(box(2, 1.5, 1));
    expect(r.warnings.map((w) => w.code)).toContain('units');
    const fixed = q(box(2, 1.5, 1), { unitScale: 25.4 });
    expect(fixed.warnings.map((w) => w.code)).not.toContain('units');
    expect(fixed.analysis.size[0]).toBeCloseTo(50.8, 3);
  });

  it('blocks parts that exceed the build volume', () => {
    const r = q(box(300, 300, 20));
    expect(r.orderable).toBe(false);
    expect(r.warnings.find((w) => w.code === 'too-big')?.level).toBe('block');
  });

  it('warns but still quotes open meshes and thin parts', () => {
    expect(q(box(20, 20, 20).slice(2)).warnings.map((w) => w.code)).toContain('open');
    const thin = q(box(85, 54, 0.6));
    expect(thin.warnings.map((w) => w.code)).toContain('thin');
    expect(thin.orderable).toBe(true);
  });

  it('blocks materials that are by request only', () => {
    expect(q(box(40, 30, 20), { material: 'Nylon' }).orderable).toBe(false);
  });

  it('goes from bytes to price in one call', () => {
    const r = quoteFromStl(generateBinarySTLCube(25), { quantity: 2 });
    expect(r.price.quantity).toBe(2);
    expect(r.price.total).toBeGreaterThan(0);
  });
});

describe('costJob', () => {
  const job = {
    ...defaultJobInputs('PLA'),
    gramsPerPart: 40,
    hoursPerPart: 2,
    quantity: 5,
    designHours: 3,
  };

  it('hits the target margin after card fees', () => {
    const r = costJob(job);
    expect(r.margin).toBeCloseTo(job.targetMargin, 2);
    expect(r.price - r.paymentFee - r.cost).toBeCloseTo(r.profit, 1);
  });

  it('itemises to the total cost', () => {
    const r = costJob(job);
    const sum = Object.values(r.lines).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(r.cost, 1);
    expect(r.lines.design).toBe(3 * job.designRatePerHour);
  });

  it('spreads design across the run', () => {
    expect(costJob({ ...job, quantity: 50 }).pricePerPart).toBeLessThan(
      costJob(job).pricePerPart / 4
    );
  });

  it('reports the real margin for a price you type in', () => {
    const r = costJob(job, 100);
    expect(r.price).toBe(100);
    expect(r.profit).toBeLessThan(0);
  });

  it('survives blank and negative inputs', () => {
    const r = costJob({ ...job, gramsPerPart: NaN, hoursPerPart: -1, quantity: 0 });
    expect(Number.isFinite(r.price)).toBe(true);
    expect(r.quantity).toBe(1);
  });
});

describe('server adapters', () => {
  it('parseSTL returns legacy units with the analysis attached', async () => {
    const d = await parseSTL(generateBinarySTLCube(20));
    expect(d.isValid).toBe(true);
    expect(d.volume).toBeCloseTo(8, 3); // cm³
    expect(d.boundingBox).toEqual({ x: 2, y: 2, z: 2 }); // cm
    expect(d.analysis).toBeDefined();
    expect(validateSTLData(d).valid).toBe(true);
  });

  it('parseSTL reports junk without throwing', async () => {
    const d = await parseSTL(new ArrayBuffer(10));
    expect(d.isValid).toBe(false);
    expect(validateSTLData(d).valid).toBe(false);
  });

  it('no longer rejects thin or large parts at upload', async () => {
    const card = await parseSTL(stl(box(85, 54, 0.8)));
    expect(validateSTLData(card).valid).toBe(true);
  });

  it('breakdown lines sum exactly to the total', async () => {
    const d = await parseSTL(table());
    for (const quantity of [1, 3, 7, 12, 60]) {
      const q = calculateDetailedQuote(d, { quantity, rushOrder: quantity % 2 === 0 });
      const b = q.breakdown;
      const lines =
        b.setupFee +
        b.materialCost +
        b.laborCost +
        b.machineCost +
        b.complexitySurcharge +
        b.shippingCost;
      expect(lines).toBeCloseTo(b.subtotal, 2);
      expect(b.subtotal - b.discount + b.rushOrderFee + b.taxAmount).toBeCloseTo(b.total, 2);
    }
  });

  it('prices old records that only have volume, area and box', () => {
    const q = calculateDetailedQuote({
      vertices: 0,
      triangles: 0,
      volume: 100,
      surfaceArea: 129,
      boundingBox: { x: 4.64, y: 4.64, z: 4.64 },
      isValid: true,
    });
    const full = buildQuote(analysisFromSummary(100000, 12900, [46.4, 46.4, 46.4]));
    expect(q.breakdown.total).toBeCloseTo(full.price.total, 2);
    expect(q.breakdown.total).toBeGreaterThan(15);
  });

  it('round-trips quote metadata through the boundingBox column', async () => {
    const q = calculateDetailedQuote(await parseSTL(generateBinarySTLCube(20)), { quantity: 4 });
    const meta = decodeQuoteMeta(encodeQuoteMeta(q));
    expect(meta.quantity).toBe(4);
    expect(meta.x).toBe(2);
    expect(meta.breakdown?.total).toBe(q.breakdown.total);
    expect(decodeQuoteMeta('{"x":1,"y":2,"z":3}').quantity).toBeUndefined();
    expect(decodeQuoteMeta('garbage')).toEqual({});
  });
});
