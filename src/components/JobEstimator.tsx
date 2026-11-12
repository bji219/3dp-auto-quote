'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ACTIVE_PRINTER,
  INTERNAL_DEFAULTS,
  JobInputs,
  LAYER_HEIGHT,
  MATERIALS,
  MaterialId,
  MeshAnalysis,
  Quality,
  StlError,
  analyzeMesh,
  buildQuote,
  costJob,
  defaultJobInputs,
  formatHours,
  formatMoney,
  parseStl,
} from '@/lib/quote-engine';
import { Label, NumberField, Row, Segmented } from './ui';

const ModelPreview = dynamic(() => import('./ModelPreview'), { ssr: false });

const STORAGE_KEY = 'idw3d.jobEstimator.rates.v1';
/** Rates that persist between jobs. Everything else resets with the page. */
const STICKY: Array<keyof JobInputs> = [
  'machineCostPerHour',
  'failureRate',
  'designRatePerHour',
  'shopRatePerHour',
  'targetMargin',
  'paymentFeePercent',
  'paymentFeeFixed',
  'packagingPerOrder',
];

const BREAKS = [1, 2, 5, 10, 25, 50, 100];

// Tuned for the dark result card.
const COST_COLOURS: Record<string, string> = {
  design: '#E7E1D5',
  setupLabor: '#a8b2bc',
  postProcess: '#6b8496',
  material: '#B85C38',
  machine: '#d48a66',
  scrap: '#f0c9b4',
  hardware: '#8a8070',
  packaging: '#5d5648',
  shipping: '#3A5060',
};
const COST_LABELS: Record<string, string> = {
  design: 'Design',
  setupLabor: 'Setup labour',
  postProcess: 'Finishing labour',
  material: 'Filament',
  machine: 'Machine time',
  scrap: 'Scrap allowance',
  hardware: 'Hardware',
  packaging: 'Packaging',
  shipping: 'Shipping',
};

function niceRound(price: number): number {
  if (price <= 0) return 0;
  const step = price < 40 ? 1 : price < 200 ? 5 : price < 1000 ? 10 : 25;
  return Math.ceil(price / step - 1e-9) * step;
}

export default function JobEstimator() {
  const [jobName, setJobName] = useState('');
  const [file, setFile] = useState<{
    name: string;
    triangles: Float32Array;
    analysis: MeshAnalysis;
  } | null>(null);
  const [fileError, setFileError] = useState('');
  const [material, setMaterial] = useState<MaterialId>('PLA');
  const [quality, setQuality] = useState<Quality>('standard');
  const [infill, setInfill] = useState(15);
  const [unitScale, setUnitScale] = useState(1);
  // Blank = use the STL estimate. A number = what your slicer says.
  const [gramsText, setGramsText] = useState('');
  const [hoursText, setHoursText] = useState('');
  const [job, setJob] = useState<JobInputs>(() => defaultJobInputs('PLA'));
  const [priceText, setPriceText] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  // Restore saved rates once, then keep them saved.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        setJob((j) => {
          const next = { ...j };
          for (const k of STICKY) if (typeof saved[k] === 'number') next[k] = saved[k];
          return next;
        });
      }
    } catch {
      /* private mode or corrupt value: fall back to defaults */
    }
    hydrated.current = true;
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      const out: Record<string, number> = {};
      for (const k of STICKY) out[k] = job[k];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    } catch {
      /* ignore */
    }
  }, [job]);

  const setJ = <K extends keyof JobInputs>(k: K, v: JobInputs[K]) =>
    setJob((j) => ({ ...j, [k]: v }));

  const openFile = async (f: File | undefined) => {
    if (!f) return;
    setFileError('');
    try {
      const triangles = parseStl(await f.arrayBuffer());
      setFile({
        name: f.name,
        triangles,
        analysis: analyzeMesh(triangles, ACTIVE_PRINTER.overhangAngle),
      });
      setUnitScale(1);
      if (!jobName) setJobName(f.name.replace(/\.stl$/i, ''));
    } catch (err) {
      setFileError(err instanceof StlError ? err.message : 'Could not read that file.');
    }
  };

  const changeMaterial = (m: MaterialId) => {
    setMaterial(m);
    setJ('materialCostPerKg', MATERIALS[m].costPerKg);
  };

  const quote = useMemo(
    () =>
      file
        ? buildQuote(file.analysis, {
            material,
            quality,
            infill,
            quantity: job.quantity,
            unitScale,
            rush: false,
          })
        : null,
    [file, material, quality, infill, job.quantity, unitScale]
  );

  const gramsOverride = gramsText.trim() === '' ? null : Number(gramsText);
  const hoursOverride = hoursText.trim() === '' ? null : Number(hoursText);
  const grams = gramsOverride ?? quote?.estimate.grams ?? 0;
  const hours = hoursOverride ?? quote?.estimate.hours ?? 0;

  const inputs: JobInputs = { ...job, gramsPerPart: grams, hoursPerPart: hours };
  const priceOverride = priceText.trim() === '' ? undefined : Number(priceText);
  const target = costJob(inputs);
  const result = costJob(inputs, priceOverride);

  const breaks = BREAKS.map((q) => ({ q, r: costJob({ ...inputs, quantity: q }) }));
  const lines = Object.entries(result.lines).filter(([, v]) => v > 0) as Array<[string, number]>;

  const summary = [
    `Quote: ${jobName || 'Custom part'}`,
    `${result.quantity} × ${jobName || 'part'} in ${MATERIALS[material].name}`,
    job.designHours > 0 ? `Includes ${job.designHours} h of design and engineering` : null,
    `Total: ${formatMoney(result.price)}` +
      (result.quantity > 1 ? ` (${formatMoney(result.pricePerPart)} each)` : ''),
    job.shippingCost > 0 ? 'Shipping included' : 'Shipping not included',
    'Valid for 14 days.',
  ]
    .filter(Boolean)
    .join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the text is visible to select by hand */
    }
  };

  const panel = 'rounded-md border border-[#C5BFAE] bg-[#F3EFE6] p-5';
  const h2 = 'mb-4 font-heading text-lg font-semibold tracking-tight';

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] xl:items-start">
      {/* ---------------- 1. print numbers ---------------- */}
      <section className={panel}>
        <h2 className={h2}>1 · The print</h2>

        <input
          ref={inputRef}
          type="file"
          accept=".stl"
          className="sr-only"
          aria-label="Choose an STL file"
          onChange={(e) => {
            openFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {file ? (
          <div className="mb-4 overflow-hidden rounded-md bg-[#0b2030] text-[#E7E1D5]">
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
              <span className="truncate">{file.name}</span>
              <span className="flex shrink-0 gap-3">
                <button
                  type="button"
                  className="text-[#e0906c] hover:text-white"
                  onClick={() => inputRef.current?.click()}
                >
                  Change
                </button>
                <button
                  type="button"
                  className="text-[#a8b2bc] hover:text-white"
                  onClick={() => setFile(null)}
                >
                  Remove
                </button>
              </span>
            </div>
            {quote && (
              <ModelPreview
                triangles={file.triangles}
                up={[quote.estimate.orientation.axis, quote.estimate.orientation.sign]}
                className="viewer-grid h-[200px]"
              />
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              openFile(e.dataTransfer.files?.[0]);
            }}
            className="mb-4 block w-full rounded-md border-2 border-dashed border-[#0C2030]/35 bg-white/60 px-4 py-8 text-center text-sm hover:border-[#0C2030]"
          >
            <span className="block font-medium">Drop an STL to estimate</span>
            <span className="text-xs text-[#3A5060]">or skip it and type slicer numbers below</span>
          </button>
        )}
        {fileError && (
          <p role="alert" className="mb-4 text-sm text-[#7a3a20]">
            {fileError}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <Label>Material</Label>
            <select
              value={material}
              onChange={(e) => changeMaterial(e.target.value as MaterialId)}
              aria-label="Material"
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {Object.values(MATERIALS).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {file && quote && (
            <>
              <div>
                <Label hint="layer height">Finish</Label>
                <Segmented
                  label="Finish"
                  value={quality}
                  onChange={setQuality}
                  options={(['draft', 'standard', 'high'] as Quality[]).map((q) => ({
                    value: q,
                    label: `${LAYER_HEIGHT[q]}`,
                  }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="infill"
                  label="Infill"
                  suffix="%"
                  value={infill}
                  min={0}
                  max={100}
                  step={5}
                  onChange={(v) => setInfill(Math.min(100, Math.max(0, v)))}
                />
                <div>
                  <span className="mb-1 block text-[0.7rem] uppercase tracking-[0.12em] text-[#3A5060]">
                    File units
                  </span>
                  <Segmented
                    label="File units"
                    value={unitScale}
                    onChange={setUnitScale}
                    options={[
                      { value: 1, label: 'mm' },
                      { value: 25.4, label: 'in' },
                    ]}
                  />
                </div>
              </div>
              <div className="rounded-md bg-white/70 px-3 py-2 text-xs text-[#3A5060]">
                <Row
                  label="Size"
                  value={quote.analysis.size.map((d) => d.toFixed(1)).join(' × ') + ' mm'}
                />
                <Row
                  label="Solid volume"
                  value={(quote.analysis.volume / 1000).toFixed(2) + ' cm³'}
                />
                <Row label="Orientation" value={quote.estimate.orientation.label} />
                <Row
                  label="Supports"
                  value={
                    quote.estimate.needsSupport
                      ? `${quote.estimate.supportGrams.toFixed(1)} g`
                      : 'none'
                  }
                />
                <Row
                  label="Estimate"
                  value={`${quote.estimate.grams.toFixed(1)} g · ${formatHours(quote.estimate.hours)}`}
                />
                {quote.warnings
                  .filter((w) => w.level !== 'info')
                  .map((w) => (
                    <p key={w.code} className="mt-1 text-[#7a3a20]">
                      {w.message}
                    </p>
                  ))}
              </div>
            </>
          )}

          <div>
            <Label hint={file ? 'blank = use estimate' : 'per part'}>From your slicer</Label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="sr-only">Grams per part</span>
                <span className="flex items-center rounded-md border border-[#C5BFAE] bg-white">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.1}
                    value={gramsText}
                    onChange={(e) => setGramsText(e.target.value)}
                    placeholder={quote ? quote.estimate.grams.toFixed(1) : '0'}
                    aria-label="Grams per part"
                    className="w-full min-w-0 rounded-md !border-0 px-3 py-2 text-sm tabular-nums !shadow-none"
                  />
                  <span className="pr-3 text-sm text-[#3A5060]">g</span>
                </span>
              </label>
              <label className="block">
                <span className="flex items-center rounded-md border border-[#C5BFAE] bg-white">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.05}
                    value={hoursText}
                    onChange={(e) => setHoursText(e.target.value)}
                    placeholder={quote ? quote.estimate.hours.toFixed(2) : '0'}
                    aria-label="Hours per part"
                    className="w-full min-w-0 rounded-md !border-0 px-3 py-2 text-sm tabular-nums !shadow-none"
                  />
                  <span className="pr-3 text-sm text-[#3A5060]">h</span>
                </span>
              </label>
            </div>
            {quote && hoursOverride !== null && hoursOverride > 0 && quote.estimate.hours > 0 && (
              <p className="mt-2 text-xs text-[#3A5060]">
                Your slicer is {(hoursOverride / quote.estimate.hours).toFixed(2)}× the estimate on
                time
                {gramsOverride
                  ? ` and ${(gramsOverride / quote.estimate.grams).toFixed(2)}× on plastic`
                  : ''}
                . If that ratio holds across a few parts, set <code>timeCalibration</code> in{' '}
                <code>quote-engine/config.ts</code>.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- 2. the job ---------------- */}
      <section className={panel}>
        <h2 className={h2}>2 · The job</h2>
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1 block text-[0.7rem] uppercase tracking-[0.12em] text-[#3A5060]">
              Job / part name
            </span>
            <input
              type="text"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="e.g. Mixer knob set for Dana"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </label>
          <NumberField
            id="qty"
            label="Quantity"
            value={job.quantity}
            min={1}
            step={1}
            onChange={(v) => setJ('quantity', Math.max(1, Math.floor(v)))}
          />

          <fieldset className="grid grid-cols-2 gap-3 border-t border-[#C5BFAE] pt-4">
            <legend className="sr-only">Labour</legend>
            <NumberField
              id="dh"
              label="Design time"
              suffix="h"
              step={0.25}
              value={job.designHours}
              onChange={(v) => setJ('designHours', v)}
            />
            <NumberField
              id="dr"
              label="Design rate"
              prefix="$"
              suffix="/h"
              value={job.designRatePerHour}
              onChange={(v) => setJ('designRatePerHour', v)}
            />
            <NumberField
              id="sm"
              label="Setup, whole job"
              suffix="min"
              value={job.setupMinutes}
              onChange={(v) => setJ('setupMinutes', v)}
            />
            <NumberField
              id="pm"
              label="Finishing, per part"
              suffix="min"
              value={job.postProcessMinutesPerPart}
              onChange={(v) => setJ('postProcessMinutesPerPart', v)}
            />
            <NumberField
              id="sr"
              label="Shop rate"
              prefix="$"
              suffix="/h"
              value={job.shopRatePerHour}
              onChange={(v) => setJ('shopRatePerHour', v)}
            />
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-3 border-t border-[#C5BFAE] pt-4">
            <legend className="sr-only">Materials and machine</legend>
            <NumberField
              id="mk"
              label="Filament"
              prefix="$"
              suffix="/kg"
              value={job.materialCostPerKg}
              onChange={(v) => setJ('materialCostPerKg', v)}
            />
            <NumberField
              id="mh"
              label="Machine cost"
              prefix="$"
              suffix="/h"
              step={0.05}
              value={job.machineCostPerHour}
              onChange={(v) => setJ('machineCostPerHour', v)}
            />
            <NumberField
              id="hw"
              label="Hardware, per part"
              prefix="$"
              step={0.05}
              value={job.hardwarePerPart}
              onChange={(v) => setJ('hardwarePerPart', v)}
            />
            <NumberField
              id="fr"
              label="Scrap rate"
              suffix="%"
              value={Math.round(job.failureRate * 1000) / 10}
              max={90}
              onChange={(v) => setJ('failureRate', v / 100)}
            />
            <NumberField
              id="pk"
              label="Packaging"
              prefix="$"
              step={0.25}
              value={job.packagingPerOrder}
              onChange={(v) => setJ('packagingPerOrder', v)}
            />
            <NumberField
              id="sh"
              label="Shipping you pay"
              prefix="$"
              step={0.5}
              value={job.shippingCost}
              onChange={(v) => setJ('shippingCost', v)}
            />
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-3 border-t border-[#C5BFAE] pt-4">
            <legend className="sr-only">Margin</legend>
            <NumberField
              id="tm"
              label="Target margin"
              suffix="%"
              value={Math.round(job.targetMargin * 1000) / 10}
              max={95}
              onChange={(v) => setJ('targetMargin', v / 100)}
            />
            <NumberField
              id="pf"
              label="Card fee"
              suffix="%"
              step={0.1}
              value={Math.round(job.paymentFeePercent * 10000) / 100}
              onChange={(v) => setJ('paymentFeePercent', v / 100)}
            />
          </fieldset>
          <button
            type="button"
            className="text-xs uppercase tracking-[0.12em] text-[#B85C38] hover:text-[#0C2030]"
            onClick={() =>
              setJob((j) => ({
                ...defaultJobInputs(material),
                quantity: j.quantity,
                designHours: j.designHours,
                hardwarePerPart: j.hardwarePerPart,
                shippingCost: j.shippingCost,
              }))
            }
          >
            Reset rates to defaults
          </button>
        </div>
      </section>

      {/* ---------------- 3. result ---------------- */}
      <section className="space-y-6 xl:sticky xl:top-6">
        <div className="overflow-hidden rounded-md bg-[#0b2030] text-[#E7E1D5]">
          <div className="p-5">
            <p className="text-[0.7rem] uppercase tracking-[0.14em] text-[#a8b2bc]">
              {priceOverride
                ? 'At your price'
                : `Quote at ${Math.round(job.targetMargin * 100)}% margin`}
            </p>
            <div className="flex items-end justify-between gap-4">
              <p className="font-heading text-5xl font-bold tabular-nums tracking-tight">
                {formatMoney(result.price)}
              </p>
              <p className="pb-1 text-right text-xs text-[#a8b2bc]">
                {formatMoney(result.pricePerPart)} per part
                {!priceOverride && (
                  <>
                    <br />
                    round to {formatMoney(niceRound(result.price))}
                  </>
                )}
              </p>
            </div>

            {/* cost stack */}
            {result.cost > 0 && (
              <div className="mt-5">
                <div
                  className="flex h-3 overflow-hidden rounded-sm"
                  role="img"
                  aria-label="Cost breakdown"
                >
                  {lines.map(([k, v]) => (
                    <span
                      key={k}
                      title={`${COST_LABELS[k]} ${formatMoney(v)}`}
                      style={{
                        width: `${(v / result.cost) * 100}%`,
                        background: COST_COLOURS[k],
                        outline: '1px solid #0b2030',
                      }}
                    />
                  ))}
                </div>
                <div className="mt-3 text-[#d5d0c5]">
                  {lines.map(([k, v]) => (
                    <Row
                      key={k}
                      label={
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-sm"
                            style={{
                              background: COST_COLOURS[k],
                              outline: '1px solid rgba(255,255,255,0.35)',
                            }}
                          />
                          {COST_LABELS[k]}
                        </span>
                      }
                      value={formatMoney(v)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 border-t border-white/10 pt-2">
              <Row label="Your cost" value={formatMoney(result.cost)} strong />
              <Row label="Card fee" value={formatMoney(result.paymentFee)} />
              <Row
                label="Profit"
                value={
                  <span className={result.profit < 0 ? 'text-[#ff9c8a]' : ''}>
                    {formatMoney(result.profit)} · {(result.margin * 100).toFixed(0)}%
                  </span>
                }
                strong
              />
              {result.effectiveHourly > 0 && (
                <Row
                  label="You earn, per hands-on hour"
                  value={formatMoney(result.effectiveHourly)}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/10 bg-black/20 p-5">
            <label className="block">
              <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.14em] text-[#a8b2bc]">
                Test a price
              </span>
              <span className="flex items-center rounded-md border border-white/30 bg-white">
                <span className="pl-3 text-sm text-[#3A5060]">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  placeholder={target.price.toFixed(2)}
                  aria-label="Test a price"
                  className="w-full min-w-0 rounded-md !border-0 px-2 py-2 text-sm tabular-nums !shadow-none"
                />
              </span>
            </label>
            <div className="text-xs text-[#a8b2bc]">
              <p className="mb-1 text-[0.65rem] uppercase tracking-[0.14em]">Block out</p>
              <p className="tabular-nums text-[#E7E1D5]">
                {result.totalGrams.toFixed(0)} g · {formatHours(result.totalHours)}
              </p>
              <p>including scrap</p>
            </div>
          </div>
        </div>

        {quote && (
          <div className={panel}>
            <h2 className={h2}>Against the public tool</h2>
            <Row
              label={`Website price, ${quote.price.quantity} × print only`}
              value={formatMoney(quote.price.total - quote.price.shipping)}
            />
            <Row
              label="This job, print only (no design, no shipping)"
              value={formatMoney(costJob({ ...inputs, designHours: 0, shippingCost: 0 }).price)}
            />
            <p className="mt-2 text-xs text-[#3A5060]">
              If the website number is below the second line, the public rates in{' '}
              <code>config.ts</code> are under your target margin for parts like this.
            </p>
          </div>
        )}

        <div className={panel}>
          <h2 className={h2}>Quantity breaks</h2>
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-[0.65rem] uppercase tracking-[0.12em] text-[#3A5060]">
                <th className="pb-2 font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Each</th>
                <th className="pb-2 text-right font-medium">Total</th>
                <th className="pb-2 text-right font-medium">Machine</th>
              </tr>
            </thead>
            <tbody>
              {breaks.map(({ q, r }) => (
                <tr
                  key={q}
                  className={
                    'border-t border-[#C5BFAE] ' + (q === result.quantity ? 'font-semibold' : '')
                  }
                >
                  <td className="py-1.5">
                    <button
                      type="button"
                      className="underline-offset-2 hover:underline"
                      onClick={() => setJ('quantity', q)}
                    >
                      {q}
                    </button>
                  </td>
                  <td className="py-1.5 text-right">{formatMoney(r.pricePerPart)}</td>
                  <td className="py-1.5 text-right">{formatMoney(r.price)}</td>
                  <td className="py-1.5 text-right text-[#3A5060]">{formatHours(r.totalHours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-[#3A5060]">
            Design and setup are spread across the run, so the per-part price falls fast.
          </p>
        </div>

        <div className={panel}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold tracking-tight">For the client</h2>
            <button
              type="button"
              onClick={copy}
              className="text-xs uppercase tracking-[0.12em] text-[#B85C38] hover:text-[#0C2030]"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-md bg-white/70 p-3 text-xs leading-relaxed">
            {summary}
          </pre>
        </div>

        <p className="text-xs text-[#3A5060]">
          Defaults: design {formatMoney(INTERNAL_DEFAULTS.designRatePerHour)}/h, shop{' '}
          {formatMoney(INTERNAL_DEFAULTS.shopRatePerHour)}/h,{' '}
          {Math.round(INTERNAL_DEFAULTS.targetMargin * 100)}% margin. Rates you change are
          remembered in this browser.
        </p>
      </section>
    </div>
  );
}
