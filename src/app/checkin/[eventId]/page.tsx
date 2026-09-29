import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CheckinScanner } from '@/components/scanner';
import { getEventAccess, requireProfile } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const profile = await requireProfile();

  const { data: event } = await supabase()
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle<Event>();
  if (!event) notFound();

  const access = await getEventAccess(profile, event.id, event.organizer_id);
  if (!access.canCheckin) {
    redirect(`/e/${event.slug}?err=${encodeURIComponent('Event staff only')}`);
  }

  const { data: recent } = await supabase()
    .from('checkins')
    .select('checked_in_at, profiles!user_id(full_name)')
    .eq('event_id', event.id)
    .order('checked_in_at', { ascending: false })
    .limit(15);

  const { count: checkedIn } = await supabase()
    .from('checkins')
    .select('user_id', { count: 'exact', head: true })
    .eq('event_id', event.id);
  const { count: registered } = await supabase()
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('status', 'registered');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Check-in — {event.name}</h1>
          <p className="text-sm text-slate-500">
            {checkedIn ?? 0} checked in · {registered ?? 0} registered
          </p>
        </div>
        <Link
          href={`/e/${event.slug}`}
          className="text-sm text-slate-500 underline"
        >
          Back to event
        </Link>
      </div>

      <CheckinScanner />

      <section className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Latest arrivals
        </h2>
        <ul className="space-y-1 text-sm">
          {(recent ?? []).map((c, i) => (
            <li key={i} className="flex justify-between text-slate-600">
              <span>
                {(c as unknown as { profiles: { full_name: string } | null })
                  .profiles?.full_name ?? 'Attendee'}
              </span>
              <span className="text-xs text-slate-400">
                {formatDateTime(c.checked_in_at)}
              </span>
            </li>
          ))}
          {(recent ?? []).length === 0 && (
            <li className="text-slate-400">Nobody yet</li>
          )}
        </ul>
      </section>
    </div>
  );
}
