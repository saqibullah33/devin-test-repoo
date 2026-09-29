import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Flash } from '@/components/flash';
import { castVote } from '@/lib/actions/votes';
import { getCurrentProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Event, Project, Team, Vote } from '@/lib/types';

export const dynamic = 'force-dynamic';

type ProjectRow = Project & { teams: Pick<Team, 'name'> | null };

export default async function VotePage({
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
  const returnTo = `/e/${slug}/vote`;

  const [{ data: projects }, { data: myVote }, { data: votes }] =
    await Promise.all([
      supabase()
        .from('projects')
        .select('*, teams(name)')
        .eq('event_id', event.id)
        .order('submitted_at')
        .returns<ProjectRow[]>(),
      profile
        ? supabase()
            .from('votes')
            .select('project_id')
            .eq('event_id', event.id)
            .eq('voter_id', profile.id)
            .maybeSingle<Vote>()
        : Promise.resolve({ data: null }),
      supabase().from('votes').select('project_id').eq('event_id', event.id),
    ]);

  const counts = new Map<string, number>();
  for (const v of votes ?? []) {
    counts.set(v.project_id, (counts.get(v.project_id) ?? 0) + 1);
  }
  const { data: reg } = profile
    ? await supabase()
        .from('registrations')
        .select('status')
        .eq('event_id', event.id)
        .eq('user_id', profile.id)
        .maybeSingle()
    : { data: null };
  const canVote = !!reg && reg.status !== 'cancelled';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Flash searchParams={searchParams} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audience vote — {event.name}</h1>
        <Link href={`/e/${slug}`} className="text-sm text-slate-500 underline">
          Back to event
        </Link>
      </div>
      <p className="text-sm text-slate-600">
        Pick your favorite project. One vote per attendee — voting again changes
        your pick.
      </p>
      {!profile && (
        <p className="card text-sm text-slate-600">
          Sign in to vote (must be registered for this event).
        </p>
      )}
      {profile && !canVote && (
        <p className="card text-sm text-slate-600">
          Only registered attendees can vote.
        </p>
      )}
      <div className="space-y-3">
        {(projects ?? []).map((p) => (
          <div
            key={p.id}
            className={`card flex items-center justify-between gap-3 ${
              myVote?.project_id === p.id ? 'border-indigo-400' : ''
            }`}
          >
            <div>
              <h3 className="font-semibold">
                {p.name}
                {myVote?.project_id === p.id && (
                  <span className="badge ml-2 bg-indigo-100 text-indigo-800">
                    your vote
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">{p.teams?.name}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                {p.description}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1">
              <span className="text-lg font-bold">
                {counts.get(p.id) ?? 0}
              </span>
              {canVote && (
                <form action={castVote}>
                  <input type="hidden" name="event_id" value={event.id} />
                  <input type="hidden" name="project_id" value={p.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button type="submit" className="btn px-3 py-1 text-xs">
                    Vote
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
      {(projects ?? []).length === 0 && (
        <p className="card text-slate-500">No submissions to vote on yet.</p>
      )}
    </div>
  );
}
