import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Flash } from '@/components/flash';
import { QrImage } from '@/components/qr';
import {
  addAnnouncement,
  assignEventRole,
  removeEventRole,
  setEventStatus,
  updateEvent,
} from '@/lib/actions/events';
import { issueCertificates } from '@/lib/actions/certificates';
import { getEventAccess, requireProfile } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { appUrl } from '@/lib/url';
import { supabase } from '@/lib/supabase';
import type { Event, EventRole, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

type RegRow = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profiles: Pick<Profile, 'full_name' | 'email'> | null;
};

export default async function ManageEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const profile = await requireProfile();

  const { data: event } = await supabase()
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle<Event>();
  if (!event) notFound();

  const access = await getEventAccess(profile, event.id, event.organizer_id);
  if (!access.canManage) redirect('/admin');

  const returnTo = `/admin/events/${event.id}`;
  const base = await appUrl();

  const [
    { data: registrations },
    { data: announcements },
    { data: roles },
    { data: checkinRows },
    { data: certificates },
  ] = await Promise.all([
    supabase()
      .from('registrations')
      .select('id, user_id, status, created_at, profiles(full_name, email)')
      .eq('event_id', event.id)
      .order('created_at')
      .returns<RegRow[]>(),
    supabase()
      .from('announcements')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false }),
    supabase()
      .from('event_roles')
      .select('*, profiles(full_name, email)')
      .eq('event_id', event.id)
      .returns<(EventRole & { profiles: Pick<Profile, 'full_name' | 'email'> | null })[]>(),
    supabase()
      .from('checkins')
      .select('user_id, checked_in_at')
      .eq('event_id', event.id),
    supabase().from('certificates').select('id').eq('event_id', event.id),
  ]);

  const checkinByUser = new Map(
    (checkinRows ?? []).map((c) => [c.user_id, c.checked_in_at]),
  );
  const checkedIn = checkinRows?.length ?? 0;

  const local = (iso: string | null) =>
    iso ? new Date(iso).toISOString().slice(0, 16) : '';

  return (
    <div className="space-y-6">
      <Flash searchParams={searchParams} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <Link
            href={`/e/${event.slug}`}
            className="text-sm text-slate-500 underline"
          >
            View public page →
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-slate-100 text-slate-600">
            {event.status}
          </span>
          {event.status !== 'published' && event.status !== 'cancelled' && (
            <StatusForm eventId={event.id} status="published" returnTo={returnTo} label="Publish" />
          )}
          {event.status === 'published' && (
            <StatusForm eventId={event.id} status="completed" returnTo={returnTo} label="Mark completed" />
          )}
          {event.status !== 'cancelled' && event.status !== 'completed' && (
            <StatusForm eventId={event.id} status="cancelled" returnTo={returnTo} label="Cancel" danger />
          )}
        </div>
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">Details</h2>
        <form action={updateEvent} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="event_id" value={event.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" defaultValue={event.name} required />
          </div>
          <div>
            <label className="label">Venue</label>
            <input name="venue" className="input" defaultValue={event.venue} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea
              name="description"
              className="input"
              rows={3}
              defaultValue={event.description}
            />
          </div>
          <div>
            <label className="label">Starts</label>
            <input
              name="starts_at"
              type="datetime-local"
              className="input"
              defaultValue={local(event.starts_at)}
            />
          </div>
          <div>
            <label className="label">Ends</label>
            <input
              name="ends_at"
              type="datetime-local"
              className="input"
              defaultValue={local(event.ends_at)}
            />
          </div>
          <div>
            <label className="label">Capacity</label>
            <input
              name="capacity"
              type="number"
              min={1}
              className="input"
              defaultValue={event.capacity ?? ''}
            />
          </div>
          <div className="self-end">
            <button type="submit" className="btn-secondary">Save details</button>
          </div>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-semibold">Announcements</h2>
          <form action={addAnnouncement} className="flex gap-2">
            <input type="hidden" name="event_id" value={event.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input name="body" className="input" placeholder="Post an update…" required />
            <button type="submit" className="btn-secondary shrink-0">Post</button>
          </form>
          <ul className="space-y-2 text-sm">
            {(announcements ?? []).map((a) => (
              <li key={a.id} className="rounded-md bg-slate-50 p-2">
                <p>{a.body}</p>
                <p className="text-xs text-slate-400">{formatDateTime(a.created_at)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">Staff &amp; judges</h2>
          <form action={assignEventRole} className="flex gap-2">
            <input type="hidden" name="event_id" value={event.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input
              name="email"
              type="email"
              className="input"
              placeholder="user@email.com"
              required
            />
            <select name="role" className="input w-auto">
              <option value="judge">judge</option>
              <option value="volunteer">volunteer</option>
              <option value="speaker">speaker</option>
            </select>
            <button type="submit" className="btn-secondary shrink-0">Add</button>
          </form>
          <ul className="space-y-1 text-sm">
            {(roles ?? []).map((r) => (
              <li
                key={`${r.user_id}-${r.role}`}
                className="flex items-center justify-between"
              >
                <span>
                  {r.profiles?.full_name ?? r.profiles?.email ?? 'User'}
                  <span className="badge ml-2 bg-indigo-100 text-indigo-800">
                    {r.role}
                  </span>
                </span>
                <form action={removeEventRole}>
                  <input type="hidden" name="event_id" value={event.id} />
                  <input type="hidden" name="user_id" value={r.user_id} />
                  <input type="hidden" name="role" value={r.role} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button className="text-xs text-red-600 underline">remove</button>
                </form>
              </li>
            ))}
            {(roles ?? []).length === 0 && (
              <li className="text-slate-400">No staff assigned</li>
            )}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-semibold">
            Registrations ({(registrations ?? []).filter((r) => r.status === 'registered').length} registered
            · {checkedIn ?? 0} checked in)
          </h2>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-1 pr-2 font-medium">Name</th>
                  <th className="py-1 pr-2 font-medium">Status</th>
                  <th className="py-1 font-medium">Checked in</th>
                </tr>
              </thead>
              <tbody>
                {(registrations ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2">
                      {r.profiles?.full_name ?? '—'}
                      <span className="block text-xs text-slate-400">
                        {r.profiles?.email}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2">{r.status}</td>
                    <td className="py-1.5">
                      {checkinByUser.has(r.user_id)
                        ? formatDateTime(checkinByUser.get(r.user_id)!)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href={`/checkin/${event.id}`} className="btn-secondary inline-block">
            Open check-in desk
          </Link>
        </section>

        <section className="space-y-6">
          <div className="card space-y-3">
            <h2 className="font-semibold">Voting QR</h2>
            <p className="text-sm text-slate-600">
              Project this during demos — attendees scan to vote.
            </p>
            <QrImage
              value={`${base}/e/${event.slug}/vote`}
              size={200}
              label={`${base}/e/${event.slug}/vote`}
            />
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Certificates</h2>
            <p className="text-sm text-slate-600">
              {(certificates ?? []).length} issued. Issues participation certs
              for checked-in attendees, winner/runner-up for the top-scoring
              teams, and role certs for staff.
            </p>
            <form action={issueCertificates}>
              <input type="hidden" name="event_id" value={event.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit" className="btn">
                Issue certificates
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusForm({
  eventId,
  status,
  returnTo,
  label,
  danger,
}: {
  eventId: string;
  status: string;
  returnTo: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={setEventStatus}>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className={danger ? 'btn-danger' : 'btn'}>
        {label}
      </button>
    </form>
  );
}
