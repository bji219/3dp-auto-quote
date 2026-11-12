import { readFileSync } from 'fs';
import { parseStl, analyzeMesh } from '../../src/lib/quote-engine/mesh';
import { estimatePrint } from '../../src/lib/quote-engine/estimate';
const S = process.argv[2];
const q: Record<string, any> = { '0.2': 'standard', '0.12': 'high', '0.28': 'draft' };
let se = 0,
  st = 0,
  n = 0,
  maxV = 0,
  maxT = 0;
for (const line of readFileSync(`${S}/truth.tsv`, 'utf8').trim().split('\n')) {
  const [name, lh, inf, cm3, sec] = line.split('\t');
  if (cm3.startsWith('ERR')) continue;
  const b = readFileSync(`${S}/stl/${name}.stl`);
  const a = analyzeMesh(parseStl(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)));
  const e = estimatePrint(a, { material: 'PLA', quality: q[lh], infill: +inf, orientation: 4 });
  const v = e.volume.total / 1000,
    t = e.hours * 3600;
  const ev = v / +cm3 - 1,
    et = t / +sec - 1;
  se += Math.abs(ev);
  st += Math.abs(et);
  n++;
  maxV = Math.max(maxV, Math.abs(ev));
  maxT = Math.max(maxT, Math.abs(et));
  console.log(
    `${name.padEnd(16)} ${lh.padEnd(5)}${inf.padEnd(4)} vol ${(+cm3).toFixed(1).padStart(6)} est ${v.toFixed(1).padStart(6)} ${(ev * 100).toFixed(0).padStart(4)}%  time ${sec.padStart(6)} est ${t.toFixed(0).padStart(6)} ${(et * 100).toFixed(0).padStart(4)}%  sup ${(e.volume.support / 1000).toFixed(1)}`
  );
}
console.log(
  `MAPE vol ${((se / n) * 100).toFixed(1)}% (max ${(maxV * 100).toFixed(0)}%)  time ${((st / n) * 100).toFixed(1)}% (max ${(maxT * 100).toFixed(0)}%)`
);
