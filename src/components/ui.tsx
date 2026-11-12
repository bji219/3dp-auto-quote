'use client';

import { ReactNode } from 'react';

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[#3A5060]">
        {children}
      </span>
      {hint && <span className="text-[0.7rem] text-[#3A5060]">{hint}</span>}
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string; sub?: string }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-px overflow-hidden rounded-md border border-[#C5BFAE] bg-[#C5BFAE]"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={
              'px-2 py-2.5 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#B85C38] ' +
              (active
                ? 'bg-[#0C2030] text-[#E7E1D5]'
                : 'bg-[#F3EFE6] text-[#0C2030] hover:bg-white')
            }
          >
            <span className="block text-sm font-medium">{o.label}</span>
            {o.sub && (
              <span
                className={'block text-[0.68rem] ' + (active ? 'text-[#a8b2bc]' : 'text-[#3A5060]')}
              >
                {o.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function NumberField({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  label,
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  id: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-[0.7rem] uppercase tracking-[0.12em] text-[#3A5060]">
        {label}
      </span>
      <span className="flex items-center rounded-md border border-[#C5BFAE] bg-white focus-within:border-[#0C2030]">
        {prefix && <span className="pl-3 text-sm text-[#3A5060]">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="w-full min-w-0 rounded-md !border-0 bg-transparent px-3 py-2 text-sm tabular-nums !shadow-none"
        />
        {suffix && <span className="pr-3 text-sm text-[#3A5060]">{suffix}</span>}
      </span>
    </label>
  );
}

export function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={
        'flex items-baseline justify-between gap-4 py-1.5 text-sm ' +
        (strong ? 'font-medium' : '') +
        (muted ? ' text-[#3A5060]' : '')
      }
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
