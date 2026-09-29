import Link from 'next/link';

import { Flash } from '@/components/flash';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { data: events } = await supabase()
    .from('events')
    .select('*')
    .in('status', ['published', 'completed'])
    .order('starts_at', { ascending: false, nullsFirst: false })
    .returns<Event[]>();

  return (
    <div className="space-y-8">
      <Flash searchParams={searchParams} />
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Community events, end to end
        </h1>
        <p className="max-w-2xl text-slate-600">
          Register, check in with a QR ticket, find a team, submit your project,
          vote for your favorites, and collect your certificate.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Events</h2>
        {(events ?? []).length === 0 && (
          <p className="card text-slate-500">No published events yet.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {(events ?? []).map((e) => (
            <Link
              key={e.id}
              href={`/e/${e.slug}`}
              className="card block transition hover:border-slate-400"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{e.name}</h3>
                <span
                  className={`badge ${
                    e.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {e.status}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                {e.description}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                {formatDate(e.starts_at)}
                {e.venue ? ` · ${e.venue}` : ''}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
