import Link from 'next/link';

import { Flash } from '@/components/flash';
import { listMyEvents } from '@/lib/actions/events';
import { formatDate } from '@/lib/format';
import type { Event } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const events = (await listMyEvents()) as Event[];

  return (
    <div className="space-y-6">
      <Flash searchParams={searchParams} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organize</h1>
        <Link href="/admin/events/new" className="btn">
          New event
        </Link>
      </div>
      {events.length === 0 && (
        <p className="card text-slate-500">
          You haven&apos;t organized any events yet.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {events.map((e) => (
          <Link
            key={e.id}
            href={`/admin/events/${e.id}`}
            className="card block transition hover:border-slate-400"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{e.name}</h3>
              <span className="badge bg-slate-100 text-slate-600">
                {e.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {formatDate(e.starts_at)}
              {e.venue ? ` · ${e.venue}` : ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
