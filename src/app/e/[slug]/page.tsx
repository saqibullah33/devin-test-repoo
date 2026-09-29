import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Flash } from '@/components/flash';
import { cancelRegistration, registerForEvent } from '@/lib/actions/registrations';
import { getCurrentProfile, getEventAccess } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Announcement, Event, Project, Registration } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const { data: event } = await supabase()
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<Event>();
  if (!event || event.status === 'draft') notFound();

  const profile = await getCurrentProfile();
  const access = await getEventAccess(profile, event.id, event.organizer_id);

  const [{ data: announcements }, { count: registeredCount }, { data: myReg }] =
    await Promise.all([
      supabase()
        .from('announcements')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false })
        .returns<Announcement[]>(),
      supabase()
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('status', 'registered'),
      profile
        ? supabase()
            .from('registrations')
            .select('*')
            .eq('event_id', event.id)
            .eq('user_id', profile.id)
            .maybeSingle<Registration>()
        : Promise.resolve({ data: null }),
    ]);

  const registered = myReg?.status === 'registered';
  const waitlisted = myReg?.status === 'waitlisted';
  const returnTo = `/e/${event.slug}`;

  return (
    <div className="space-y-8">
      <Flash searchParams={searchParams} />

      <section className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatDateTime(event.starts_at)}
              {event.ends_at ? ` – ${formatDateTime(event.ends_at)}` : ''}
              {event.venue ? ` · ${event.venue}` : ''}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {registeredCount ?? 0} registered
              {event.capacity ? ` / ${event.capacity} capacity` : ''}
            </p>
          </div>
          <span
            className={`badge ${
              event.status === 'published'
                ? 'bg-emerald-100 text-emerald-800'
                : event.status === 'completed'
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {event.status}
          </span>
        </div>

        {event.description ? (
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {event.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {event.status === 'published' && !registered && !waitlisted && (
            <form action={registerForEvent} className="flex items-center gap-2">
              <input type="hidden" name="event_id" value={event.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input
                name="note"
                className="input w-64"
                placeholder="Anything organizers should know? (optional)"
              />
              <button type="submit" className="btn">
                {profile ? 'Register' : 'Sign in & register'}
              </button>
            </form>
          )}
          {(registered || waitlisted) && (
            <>
              <Link href={`/e/${event.slug}/my-ticket`} className="btn">
                My QR ticket
              </Link>
              <form action={cancelRegistration}>
                <input type="hidden" name="event_id" value={event.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button type="submit" className="btn-danger">
                  {waitlisted ? 'Leave waitlist' : 'Cancel registration'}
                </button>
              </form>
              {waitlisted && (
                <span className="badge bg-amber-100 text-amber-800">
                  waitlisted
                </span>
              )}
            </>
          )}
          <Link href={`/e/${event.slug}/teams`} className="btn-secondary">
            Teams
          </Link>
          <Link href={`/e/${event.slug}/projects`} className="btn-secondary">
            Projects
          </Link>
          <Link href={`/e/${event.slug}/vote`} className="btn-secondary">
            Vote
          </Link>
          <Link href={`/e/${event.slug}/submit`} className="btn-secondary">
            Submit project
          </Link>
          {access.isJudge && (
            <Link href={`/e/${event.slug}/judge`} className="btn-secondary">
              Judge dashboard
            </Link>
          )}
          {access.canCheckin && (
            <Link href={`/checkin/${event.id}`} className="btn-secondary">
              Check-in desk
            </Link>
          )}
          {access.canManage && (
            <Link href={`/admin/events/${event.id}`} className="btn-secondary">
              Manage
            </Link>
          )}
        </div>
      </section>

      {(announcements ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Announcements</h2>
          <ul className="space-y-2">
            {announcements!.map((a) => (
              <li key={a.id} className="card text-sm">
                <p className="whitespace-pre-wrap">{a.body}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {formatDateTime(a.created_at)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {event.status === 'completed' && <Results eventId={event.id} />}
    </div>
  );
}

async function Results({ eventId }: { eventId: string }) {
  const { data: projects } = await supabase()
    .from('projects')
    .select('id, name')
    .eq('event_id', eventId)
    .returns<Pick<Project, 'id' | 'name'>[]>();
  if (!projects || projects.length === 0) return null;

  const ids = projects.map((p) => p.id);
  const [{ data: scores }, { data: votes }] = await Promise.all([
    supabase()
      .from('scores')
      .select('project_id, innovation, ux, technical, impact')
      .in('project_id', ids),
    supabase().from('votes').select('project_id').in('project_id', ids),
  ]);

  const judge = new Map<string, { sum: number; n: number }>();
  for (const s of scores ?? []) {
    const t = judge.get(s.project_id) ?? { sum: 0, n: 0 };
    t.sum += s.innovation + s.ux + s.technical + s.impact;
    t.n += 1;
    judge.set(s.project_id, t);
  }
  const crowd = new Map<string, number>();
  for (const v of votes ?? []) {
    crowd.set(v.project_id, (crowd.get(v.project_id) ?? 0) + 1);
  }

  const rows = projects
    .map((p) => ({
      name: p.name,
      avg: judge.has(p.id) ? judge.get(p.id)!.sum / judge.get(p.id)!.n : 0,
      votes: crowd.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.avg - a.avg);

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Results</h2>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-2 font-medium">Project</th>
              <th className="px-4 py-2 font-medium">Judge score (avg /40)</th>
              <th className="px-4 py-2 font-medium">Audience votes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className="border-b border-slate-100">
                <td className="px-4 py-2">
                  {i === 0 ? '🏆 ' : i === 1 ? '🥈 ' : ''}
                  {r.name}
                </td>
                <td className="px-4 py-2">{r.avg.toFixed(1)}</td>
                <td className="px-4 py-2">{r.votes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
