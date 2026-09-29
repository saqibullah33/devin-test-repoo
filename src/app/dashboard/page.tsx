import Link from 'next/link';

import { Flash } from '@/components/flash';
import { requireProfile } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Certificate, Event, Registration } from '@/lib/types';

export const dynamic = 'force-dynamic';

type RegRow = Registration & {
  events: Pick<Event, 'name' | 'slug' | 'starts_at' | 'venue'> | null;
};
type CertRow = Certificate & {
  events: Pick<Event, 'name' | 'slug'> | null;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();

  const [{ data: regs }, { data: memberships }, { data: certs }] =
    await Promise.all([
      supabase()
        .from('registrations')
        .select('*, events(name, slug, starts_at, venue)')
        .eq('user_id', profile.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .returns<RegRow[]>(),
      supabase()
        .from('team_members')
        .select('event_id, role_in_team, teams(name), events(name, slug)')
        .eq('user_id', profile.id),
      supabase()
        .from('certificates')
        .select('*, events(name, slug)')
        .eq('user_id', profile.id)
        .order('issued_at', { ascending: false })
        .returns<CertRow[]>(),
    ]);

  return (
    <div className="space-y-8">
      <Flash searchParams={searchParams} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name}</h1>
          <Link
            href={`/u/${profile.clerk_id}`}
            className="text-sm text-slate-500 underline"
          >
            View public profile →
          </Link>
        </div>
        <Link href="/dashboard/profile" className="btn-secondary">
          Edit profile
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My registrations</h2>
        {(regs ?? []).length === 0 && (
          <p className="card text-slate-500">Not registered for anything yet.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {(regs ?? []).map((r) => (
            <div key={r.id} className="card flex items-center justify-between">
              <div>
                <Link
                  href={`/e/${r.events?.slug}`}
                  className="font-semibold hover:underline"
                >
                  {r.events?.name}
                </Link>
                <p className="text-xs text-slate-500">
                  {formatDate(r.events?.starts_at ?? null)}
                  {r.events?.venue ? ` · ${r.events.venue}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`badge ${
                    r.status === 'registered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {r.status}
                </span>
                <Link
                  href={`/e/${r.events?.slug}/my-ticket`}
                  className="btn-secondary px-3 py-1 text-xs"
                >
                  Ticket
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My teams</h2>
        {(memberships ?? []).length === 0 && (
          <p className="card text-slate-500">No teams yet.</p>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {(memberships ?? []).map((m, i) => (
            <li key={i} className="card text-sm">
              <span className="font-semibold">
                {(m as unknown as { teams: { name: string } | null }).teams?.name}
              </span>
              <span className="text-slate-500">
                {' '}
                — {(m as unknown as { events: { name: string } | null }).events?.name}
              </span>
              {m.role_in_team && (
                <span className="badge ml-2 bg-slate-100 text-slate-600">
                  {m.role_in_team}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My certificates</h2>
        {(certs ?? []).length === 0 && (
          <p className="card text-slate-500">No certificates yet.</p>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {(certs ?? []).map((c) => (
            <li key={c.id} className="card flex items-center justify-between text-sm">
              <div>
                <span className="font-semibold capitalize">
                  {c.type.replace('_', ' ')}
                </span>
                <span className="text-slate-500"> — {c.events?.name}</span>
                <p className="font-mono text-xs text-slate-400">{c.cert_code}</p>
              </div>
              <a
                href={`/api/certificates/${c.cert_code}/pdf`}
                className="btn-secondary px-3 py-1 text-xs"
              >
                PDF
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
