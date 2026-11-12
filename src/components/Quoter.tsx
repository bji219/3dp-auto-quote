'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ACTIVE_PRINTER,
  DEFAULT_OPTIONS,
  LAYER_HEIGHT,
  MATERIALS,
  MaterialId,
  MeshAnalysis,
  PUBLIC_PRICING,
  Quality,
  QuoteOptions,
  StlError,
  analyzeMesh,
  buildQuote,
  formatHours,
  formatMoney,
  parseStl,
} from '@/lib/quote-engine';
import { Label, Row, Segmented } from './ui';

const ModelPreview = dynamic(() => import('./ModelPreview'), { ssr: false });

const CONTACT = 'hello@idw3d.com';
const MAX_FILE_MB = 50;
/** Netlify caps request bodies at ~6 MB; leave headroom for multipart framing. */
const MAX_UPLOAD_BYTES = 5.5 * 1024 * 1024;

interface Loaded {
  file: File;
  triangles: Float32Array;
  analysis: MeshAnalysis;
}

const UNITS = [
  { value: 1, label: 'mm' },
  { value: 10, label: 'cm' },
  { value: 25.4, label: 'in' },
  { value: 1000, label: 'm' },
];

const INFILL = [
  { value: 10, label: 'Light', sub: '10%' },
  { value: 15, label: 'Standard', sub: '15%' },
  { value: 30, label: 'Strong', sub: '30%' },
  { value: 60, label: 'Dense', sub: '60%' },
];

const QUALITY: Array<{ value: Quality; label: string; sub: string }> = [
  { value: 'draft', label: 'Draft', sub: `${LAYER_HEIGHT.draft} mm` },
  { value: 'standard', label: 'Standard', sub: `${LAYER_HEIGHT.standard} mm` },
  { value: 'high', label: 'Fine', sub: `${LAYER_HEIGHT.high} mm` },
];

async function gzip(file: File): Promise<Blob | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    return await new Response(file.stream().pipeThrough(new CompressionStream('gzip'))).blob();
  } catch {
    return null;
  }
}

export default function Quoter() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [options, setOptions] = useState<QuoteOptions>(DEFAULT_OPTIONS);
  const [color, setColor] = useState('');
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const [busy, setBusy] = useState<'order' | 'email' | null>(null);
  const [actionError, setActionError] = useState('');
  const [email, setEmail] = useState('');
  const [emailSentTo, setEmailSentTo] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const savedQuote = useRef<{ key: string; id: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof QuoteOptions>(key: K, value: QuoteOptions[K]) =>
    setOptions((o) => ({ ...o, [key]: value }));

  const openFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setFileError('');
    setActionError('');
    setEmailSentTo('');
    if (!file.name.toLowerCase().endsWith('.stl')) {
      setFileError(
        `"${file.name}" is not an STL. Export your model as STL (binary or ASCII) and drop it here, or email other formats to ${CONTACT}.`
      );
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(
        `That file is over ${MAX_FILE_MB} MB. Email it to ${CONTACT} and we will quote it by hand.`
      );
      return;
    }
    setReading(true);
    try {
      const buffer = await file.arrayBuffer();
      // Yield so the "reading" state paints before the heavy work.
      await new Promise((r) => setTimeout(r, 0));
      const triangles = parseStl(buffer);
      const analysis = analyzeMesh(triangles, ACTIVE_PRINTER.overhangAngle);
      setLoaded({ file, triangles, analysis });
      setOptions((o) => ({ ...o, unitScale: 1 }));
    } catch (err) {
      setFileError(
        err instanceof StlError
          ? err.message
          : `We could not read that file. Email it to ${CONTACT} and we will take a look.`
      );
    } finally {
      setReading(false);
    }
  }, []);

  const quote = useMemo(
    () => (loaded ? buildQuote(loaded.analysis, options) : null),
    [loaded, options]
  );

  /** Save the quote server-side (the server recomputes the price) and return its id. */
  const saveQuote = async (): Promise<string> => {
    if (!loaded || !quote) throw new Error('No model loaded.');
    const key = JSON.stringify([
      loaded.file.name,
      loaded.file.size,
      loaded.file.lastModified,
      options,
      color,
    ]);
    if (savedQuote.current?.key === key) return savedQuote.current.id;

    const form = new FormData();
    const packed = await gzip(loaded.file);
    const body = packed && packed.size < loaded.file.size ? packed : loaded.file;
    if (body.size > MAX_UPLOAD_BYTES) {
      throw new Error(
        `This file is too large to send through the site. Email it to ${CONTACT} and quote ${formatMoney(quote.price.total)} for ${quote.price.quantity} × ${loaded.file.name}; we will honour it.`
      );
    }
    form.append('file', body, loaded.file.name);
    form.append('fileName', loaded.file.name);
    if (body !== loaded.file) form.append('encoding', 'gzip');
    form.append('options', JSON.stringify({ ...options, color: color || undefined }));
    form.append('website', honeypot);

    let response: Response;
    try {
      response = await fetch('/api/quotes', { method: 'POST', body: form });
    } catch {
      throw new Error(
        `Could not reach the server. Check your connection, or email your file to ${CONTACT}.`
      );
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      throw new Error(
        result?.message ||
          `Online ordering is unavailable right now. Email your file to ${CONTACT} and mention this quote.`
      );
    }
    savedQuote.current = { key, id: result.quote.id };
    return result.quote.id;
  };

  const order = async () => {
    setBusy('order');
    setActionError('');
    try {
      const id = await saveQuote();
      window.location.href = '/order/' + id;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(null);
    }
  };

  const sendEmail = async () => {
    setBusy('email');
    setActionError('');
    try {
      const id = await saveQuote();
      const response = await fetch(`/api/quote/${id}/save-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success)
        throw new Error(result?.message || 'Could not send the email.');
      setEmailSentTo(email);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      openFile(e.dataTransfer.files?.[0]);
    },
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".stl,model/stl,application/sla,application/octet-stream"
      className="sr-only"
      aria-label="Choose an STL file"
      onChange={(e) => {
        openFile(e.target.files?.[0]);
        e.target.value = '';
      }}
    />
  );

  /* ---------------------------- empty state ---------------------------- */
  if (!loaded || !quote) {
    return (
      <div className="mx-auto max-w-3xl">
        {fileInput}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          {...dropHandlers}
          disabled={reading}
          className={
            'dropzone group relative block w-full overflow-hidden rounded-md border-2 border-dashed px-6 py-16 text-center transition-all md:py-24 ' +
            (dragging
              ? 'border-[#B85C38] bg-white'
              : 'border-[#0C2030]/35 bg-[#F3EFE6] hover:border-[#0C2030] hover:bg-white')
          }
        >
          <svg
            className="mx-auto mb-6 h-14 w-14 text-[#0C2030] transition-transform group-hover:-translate-y-1"
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M24 4 42 14v20L24 44 6 34V14L24 4Z" />
            <path d="M6 14l18 10 18-10M24 24v20" />
          </svg>
          <span className="block font-heading text-2xl font-bold tracking-tight md:text-3xl">
            {reading ? 'Reading your model…' : dragging ? 'Drop it' : 'Drop an STL here'}
          </span>
          <span className="mt-2 block text-sm text-[#3A5060]">
            or click to browse · up to {MAX_FILE_MB} MB · your price appears instantly
          </span>
        </button>

        {fileError && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-[#B85C38]/50 bg-[#B85C38]/10 px-4 py-3 text-sm text-[#7a3a20]"
          >
            {fileError}
          </p>
        )}

        <ol className="mt-10 grid gap-6 text-sm md:grid-cols-3">
          {[
            [
              '01',
              'Upload',
              'We measure the mesh in your browser. Nothing is sent until you order.',
            ],
            [
              '02',
              'Configure',
              'Pick material, layer height, strength and quantity. The price follows live.',
            ],
            ['03', 'Order', 'Pay by card. We check printability and get it on a machine.'],
          ].map(([n, title, body]) => (
            <li key={n} className="border-t border-[#0C2030] pt-3">
              <span className="text-xs text-[#B85C38]">{n}</span>
              <h3 className="mt-1 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-[#3A5060]">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  /* ---------------------------- loaded state ---------------------------- */
  const { analysis, estimate, price, warnings } = quote;
  const mat = MATERIALS[options.material];
  const o = estimate.orientation;
  const blocked = !quote.orderable;
  const mailto =
    `mailto:${CONTACT}?subject=` +
    encodeURIComponent(`Quote request: ${loaded.file.name}`) +
    '&body=' +
    encodeURIComponent(
      `File: ${loaded.file.name}\nSize: ${analysis.size.map((d) => d.toFixed(1)).join(' × ')} mm\nMaterial: ${mat.name}\nQuantity: ${price.quantity}\n\n(Please attach the file.)`
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
      {fileInput}

      {/* ------------ model ------------ */}
      <section className="lg:sticky lg:top-6" {...dropHandlers}>
        <div
          className={
            'overflow-hidden rounded-md bg-[#0b2030] text-[#E7E1D5] ' +
            (dragging ? 'ring-2 ring-[#B85C38]' : '')
          }
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <p className="truncate text-sm" title={loaded.file.name}>
              {loaded.file.name}
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="shrink-0 text-xs uppercase tracking-[0.12em] text-[#e0906c] hover:text-white"
            >
              Change file
            </button>
          </div>
          <ModelPreview
            triangles={loaded.triangles}
            up={[o.axis, o.sign]}
            className="viewer-grid h-[300px] sm:h-[400px]"
          />
          <dl className="grid grid-cols-3 gap-px border-t border-white/10 bg-white/10 text-center">
            {[
              [
                'Size',
                analysis.size.map((d) => (d >= 100 ? d.toFixed(0) : d.toFixed(1))).join(' × ') +
                  ' mm',
              ],
              [
                'Volume',
                (analysis.volume / 1000).toFixed(analysis.volume < 10000 ? 2 : 1) + ' cm³',
              ],
              ['Triangles', analysis.triangles.toLocaleString('en-US')],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#0b2030] px-2 py-3">
                <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-[#a8b2bc]">{k}</dt>
                <dd className="mt-0.5 text-xs tabular-nums sm:text-sm">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-2 text-xs text-[#3A5060]">
          Shown as we would print it ({o.label}). Drag to rotate, scroll to zoom.
        </p>

        {warnings.length > 0 && (
          <ul className="mt-4 space-y-2">
            {warnings.map((w) => (
              <li
                key={w.code}
                role={w.level === 'info' ? undefined : 'alert'}
                className={
                  'rounded-md border px-3 py-2.5 text-sm ' +
                  (w.level === 'info'
                    ? 'border-[#C5BFAE] bg-[#F3EFE6] text-[#3A5060]'
                    : 'border-[#B85C38]/50 bg-[#B85C38]/10 text-[#7a3a20]')
                }
              >
                {w.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------ options + price ------------ */}
      <section className="space-y-6">
        <div className="space-y-5 rounded-md border border-[#C5BFAE] bg-[#F3EFE6] p-5">
          <div>
            <Label hint={mat.blurb}>Material</Label>
            <select
              value={options.material}
              onChange={(e) => set('material', e.target.value as MaterialId)}
              aria-label="Material"
              className="w-full rounded-md border px-3 py-2.5 text-sm"
            >
              {Object.values(MATERIALS).map((m) => (
                <option key={m.id} value={m.id} disabled={!m.available}>
                  {m.name}
                  {m.available ? '' : ' (by request)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label hint="Layer height">Finish</Label>
            <Segmented
              label="Finish"
              value={options.quality}
              options={QUALITY}
              onChange={(v) => set('quality', v)}
            />
          </div>

          <div>
            <Label hint="Infill density">Strength</Label>
            <Segmented
              label="Strength"
              value={options.infill}
              options={INFILL}
              onChange={(v) => set('infill', v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantity</Label>
              <div className="flex items-stretch overflow-hidden rounded-md border border-[#C5BFAE] bg-white">
                <button
                  type="button"
                  aria-label="Fewer"
                  onClick={() => set('quantity', Math.max(1, options.quantity - 1))}
                  className="px-3 text-lg hover:bg-[#E7E1D5]"
                >
                  −
                </button>
                <input
                  type="number"
                  aria-label="Quantity"
                  min={1}
                  max={PUBLIC_PRICING.maxQuantity}
                  value={options.quantity}
                  onChange={(e) =>
                    set(
                      'quantity',
                      Math.min(
                        PUBLIC_PRICING.maxQuantity,
                        Math.max(1, Math.floor(Number(e.target.value) || 1))
                      )
                    )
                  }
                  className="w-full min-w-0 !border-0 py-2 text-center text-sm tabular-nums !shadow-none"
                />
                <button
                  type="button"
                  aria-label="More"
                  onClick={() =>
                    set('quantity', Math.min(PUBLIC_PRICING.maxQuantity, options.quantity + 1))
                  }
                  className="px-3 text-lg hover:bg-[#E7E1D5]"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <Label>File units</Label>
              <Segmented
                label="File units"
                value={options.unitScale ?? 1}
                options={UNITS}
                onChange={(v) => set('unitScale', v)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label hint="optional">Colour</Label>
              <input
                type="text"
                value={color}
                maxLength={60}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. matte black"
                aria-label="Colour"
                className="w-full rounded-md border px-3 py-2.5 text-sm"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3 self-end rounded-md border border-[#C5BFAE] bg-white px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={options.rush}
                onChange={(e) => set('rush', e.target.checked)}
                className="h-4 w-4 accent-[#B85C38]"
              />
              <span>
                Rush <span className="text-[#3A5060]">· ships in 2–3 days</span>
              </span>
            </label>
          </div>
        </div>

        {/* price */}
        <div className="overflow-hidden rounded-md bg-[#0b2030] text-[#E7E1D5]">
          <div className="p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.14em] text-[#a8b2bc]">
                  {blocked ? 'Indicative price' : 'Your price'}
                </p>
                <p
                  className="font-heading text-5xl font-bold tabular-nums tracking-tight"
                  aria-live="polite"
                >
                  {formatMoney(price.total)}
                </p>
              </div>
              <div className="pb-1 text-right text-xs text-[#a8b2bc]">
                <p className="tabular-nums">{formatMoney(price.unitPrice)} per part</p>
                <p>
                  {price.freeShipping
                    ? 'free shipping'
                    : price.shipping > 0
                      ? `incl. ${formatMoney(price.shipping)} shipping`
                      : ''}
                </p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-sm">
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-[#a8b2bc]">
                  Plastic
                </dt>
                <dd className="tabular-nums">
                  {price.totalGrams.toFixed(price.totalGrams < 100 ? 1 : 0)} g
                </dd>
              </div>
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-[#a8b2bc]">
                  Print time
                </dt>
                <dd className="tabular-nums">{formatHours(price.totalHours)}</dd>
              </div>
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-[#a8b2bc]">
                  Layers
                </dt>
                <dd className="tabular-nums">{estimate.layers.toLocaleString('en-US')}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => setShowBreakdown((v) => !v)}
              aria-expanded={showBreakdown}
              className="mt-4 text-xs uppercase tracking-[0.12em] text-[#e0906c] hover:text-white"
            >
              {showBreakdown ? 'Hide' : 'Show'} breakdown {showBreakdown ? '−' : '+'}
            </button>
            {showBreakdown && (
              <div className="mt-2 border-t border-white/10 pt-2 text-[#d5d0c5]">
                <Row label="Setup" value={formatMoney(price.setupFee)} />
                <Row
                  label={`Parts · ${price.quantity} × ${formatMoney(price.unitPrice)}`}
                  value={formatMoney(price.partsTotal)}
                />
                <div className="pl-3 text-xs text-[#a8b2bc]">
                  per part: material {formatMoney(price.unit.material)} · machine{' '}
                  {formatMoney(price.unit.machine)} · handling {formatMoney(price.unit.handling)}
                  {price.unit.supportRemoval > 0 && (
                    <> · support removal {formatMoney(price.unit.supportRemoval)}</>
                  )}
                </div>
                {price.discount > 0 && (
                  <Row
                    label={`Quantity discount · ${price.discountPercent}%`}
                    value={'−' + formatMoney(price.discount)}
                  />
                )}
                {price.minimumAdjustment > 0 && (
                  <Row
                    label={`Minimum order (${formatMoney(PUBLIC_PRICING.minimumOrder)})`}
                    value={'+' + formatMoney(price.minimumAdjustment)}
                  />
                )}
                {price.rushFee > 0 && <Row label="Rush" value={formatMoney(price.rushFee)} />}
                <Row
                  label="Shipping"
                  value={price.freeShipping ? 'Free' : formatMoney(price.shipping)}
                />
                {price.tax > 0 && <Row label="Tax" value={formatMoney(price.tax)} />}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-black/20 p-5">
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px' }}
            />
            {blocked ? (
              <a
                href={mailto}
                className="cta block w-full rounded-md bg-[#B85C38] px-5 py-3.5 text-center text-sm font-semibold uppercase tracking-[0.12em] text-white hover:bg-[#a04e2e]"
              >
                Email us for a manual quote →
              </a>
            ) : (
              <button
                type="button"
                onClick={order}
                disabled={busy !== null}
                className="cta block w-full rounded-md bg-[#B85C38] px-5 py-3.5 text-center text-sm font-semibold uppercase tracking-[0.12em] text-white hover:bg-[#a04e2e] disabled:opacity-60"
              >
                {busy === 'order' ? 'Saving your quote…' : 'Order now →'}
              </button>
            )}

            {!blocked &&
              (emailSentTo ? (
                <p className="mt-3 text-sm text-[#d5d0c5]">
                  Sent to {emailSentTo}. The link inside is good for {PUBLIC_PRICING.quoteValidDays}{' '}
                  days.
                </p>
              ) : (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendEmail();
                  }}
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="or email me this quote"
                    aria-label="Email address"
                    className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={busy !== null || !email}
                    className="rounded-md border border-white/30 px-4 text-sm text-[#E7E1D5] hover:bg-white/10 disabled:opacity-50"
                  >
                    {busy === 'email' ? '…' : 'Send'}
                  </button>
                </form>
              ))}

            {actionError && (
              <p
                role="alert"
                className="mt-3 rounded-md border border-[#e0906c]/60 bg-[#B85C38]/20 px-3 py-2 text-sm text-[#f3d9cc]"
              >
                {actionError}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#3A5060]">
          Estimated from your mesh: wall, skin, infill and support volumes at a{' '}
          {estimate.layerHeight} mm layer on a 0.4 mm nozzle. Final price is confirmed when we slice
          the part; if it differs by more than 10% we will ask before printing.
        </p>
      </section>
    </div>
  );
}
