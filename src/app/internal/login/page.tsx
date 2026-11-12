'use client';

import { useState } from 'react';
import SiteChrome from '@/components/SiteChrome';

export default function InternalLogin() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const response = await fetch('/api/internal/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    if (response.ok) {
      window.location.href = '/internal';
      return;
    }
    const result = await response.json().catch(() => null);
    setError(result?.message || 'Could not sign in.');
    setBusy(false);
  };

  return (
    <SiteChrome>
      <form onSubmit={submit} className="mx-auto max-w-sm">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Shop tools</h1>
        <p className="mt-2 text-sm text-[#3A5060]">Enter the shop passcode.</p>
        <input
          type="password"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          aria-label="Passcode"
          className="mt-6 w-full rounded-md border px-3 py-2.5"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-[#7a3a20]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !passcode}
          className="cta mt-4 w-full rounded-md bg-[#0C2030] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#E7E1D5] disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </SiteChrome>
  );
}
