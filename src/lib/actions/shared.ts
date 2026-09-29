import 'server-only';

import { redirect } from 'next/navigation';

export function back(returnTo: string, msg: string, isError = false): never {
  const sep = returnTo.includes('?') ? '&' : '?';
  const key = isError ? 'err' : 'msg';
  redirect(`${returnTo}${sep}${key}=${encodeURIComponent(msg)}`);
}

export function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

export function intOrNull(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
