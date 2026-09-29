'use client';

import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';

import { checkinByTicket } from '@/lib/actions/registrations';

interface ScanLog {
  text: string;
  ok: boolean;
  at: string;
}

export function CheckinScanner() {
  const [manual, setManual] = useState('');
  const [log, setLog] = useState<ScanLog[]>([]);
  const busy = useRef(false);

  const push = (text: string, ok: boolean) =>
    setLog((l) =>
      [{ text, ok, at: new Date().toLocaleTimeString() }, ...l].slice(0, 20),
    );

  const handle = async (raw: string) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const code = extractCode(raw);
      const res = await checkinByTicket(code);
      push(res.message, res.ok);
    } catch {
      push('Scan failed — try again', false);
    } finally {
      setTimeout(() => {
        busy.current = false;
      }, 800);
    }
  };

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 8, qrbox: { width: 220, height: 220 } },
      false,
    );
    scanner.render(
      (decoded) => void handle(decoded),
      () => {},
    );
    return () => {
      scanner.clear().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card">
        <div id="qr-reader" className="w-full" />
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void handle(manual);
            setManual('');
          }}
        >
          <input
            className="input"
            placeholder="Or paste a ticket code"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <button type="submit" className="btn">
            Check in
          </button>
        </form>
      </div>
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Recent scans
        </h2>
        <ul className="space-y-2 text-sm">
          {log.length === 0 && (
            <li className="text-slate-400">No scans yet</li>
          )}
          {log.map((l, i) => (
            <li
              key={i}
              className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                l.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              <span>{l.text}</span>
              <span className="text-xs opacity-60">{l.at}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function extractCode(raw: string): string {
  const text = raw.trim();
  try {
    const parsed = JSON.parse(text) as { t?: string };
    if (parsed.t) return parsed.t;
  } catch {}
  try {
    const url = new URL(text);
    const t = url.searchParams.get('t');
    if (t) return t;
  } catch {}
  return text;
}
