import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { QrImage } from '@/components/qr';
import { requireProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Event, Registration } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MyTicketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await requireProfile();

  const { data: event } = await supabase()
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<Event>();
  if (!event) notFound();

  const { data: reg } = await supabase()
    .from('registrations')
    .select('*')
    .eq('event_id', event.id)
    .eq('user_id', profile.id)
    .maybeSingle<Registration>();
  if (!reg || reg.status === 'cancelled') redirect(`/e/${slug}`);

  const { data: checkin } = await supabase()
    .from('checkins')
    .select('checked_in_at')
    .eq('event_id', event.id)
    .eq('user_id', profile.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <h1 className="text-2xl font-bold">{event.name}</h1>
      <div className="card flex flex-col items-center gap-4">
        {reg.status === 'waitlisted' ? (
          <p className="text-amber-700">
            You are on the waitlist — this ticket activates if a spot opens.
          </p>
        ) : null}
        <QrImage
          value={JSON.stringify({ t: reg.ticket_code })}
          size={260}
          label="Show this at the door"
        />
        <p className="font-mono text-xs text-slate-500">{reg.ticket_code}</p>
        {checkin ? (
          <span className="badge bg-emerald-100 text-emerald-800">
            Checked in {new Date(checkin.checked_in_at).toLocaleTimeString()}
          </span>
        ) : (
          <span className="badge bg-slate-100 text-slate-600">
            Not checked in yet
          </span>
        )}
      </div>
      <Link href={`/e/${slug}`} className="text-sm text-slate-500 underline">
        Back to event
      </Link>
    </div>
  );
}
