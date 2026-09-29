import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Flash } from '@/components/flash';
import {
  createTeam,
  leaveTeam,
  requestJoinTeam,
  respondToJoinRequest,
} from '@/lib/actions/teams';
import { getCurrentProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type {
  Event,
  JoinRequest,
  Profile,
  Registration,
  Team,
  TeamMember,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

type TeamWithMembers = Team & {
  team_members: (TeamMember & { profiles: Pick<Profile, 'full_name' | 'headline'> | null })[];
};

export default async function TeamsPage({
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
  const returnTo = `/e/${slug}/teams`;

  const { data: teams } = await supabase()
    .from('teams')
    .select('*, team_members(*, profiles(full_name, headline))')
    .eq('event_id', event.id)
    .order('created_at')
    .returns<TeamWithMembers[]>();

  const { data: myReg } = profile
    ? await supabase()
        .from('registrations')
        .select('status')
        .eq('event_id', event.id)
        .eq('user_id', profile.id)
        .maybeSingle<Registration>()
    : { data: null };
  const isRegistered = !!myReg && myReg.status !== 'cancelled';
  const myTeam = (teams ?? []).find((t) =>
    t.team_members.some((m) => m.user_id === profile?.id),
  );

  const { data: pendingRequests } = profile
    ? await supabase()
        .from('join_requests')
        .select('*, profiles(full_name, headline)')
        .eq('status', 'pending')
        .in('team_id', (teams ?? []).map((t) => t.id))
        .returns<(JoinRequest & { profiles: Pick<Profile, 'full_name' | 'headline'> | null })[]>()
    : { data: [] };

  return (
    <div className="space-y-6">
      <Flash searchParams={searchParams} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams — {event.name}</h1>
        <Link href={`/e/${slug}`} className="text-sm text-slate-500 underline">
          Back to event
        </Link>
      </div>

      {isRegistered && !myTeam && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Create a team</h2>
          <form action={createTeam} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="event_id" value={event.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <div>
              <label className="label" htmlFor="name">Team name</label>
              <input id="name" name="name" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="looking_for">
                Looking for (comma-separated skills)
              </label>
              <input
                id="looking_for"
                name="looking_for"
                className="input"
                placeholder="frontend, AI/ML, design"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">
                What are you building?
              </label>
              <textarea
                id="description"
                name="description"
                className="input"
                rows={2}
              />
            </div>
            <div>
              <button type="submit" className="btn">Create team</button>
            </div>
          </form>
        </section>
      )}

      {myTeam && (
        <section className="card space-y-2 border-slate-400">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your team: {myTeam.name}</h2>
            <form action={leaveTeam}>
              <input type="hidden" name="team_id" value={myTeam.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit" className="btn-danger px-3 py-1 text-xs">
                Leave
              </button>
            </form>
          </div>
          <p className="text-sm text-slate-600">{myTeam.description}</p>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {(teams ?? []).map((team) => {
          const isOwner = team.created_by === profile?.id;
          const requests = (pendingRequests ?? []).filter(
            (r) => r.team_id === team.id,
          );
          return (
            <div key={team.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{team.name}</h3>
                <span className="badge bg-slate-100 text-slate-600">
                  {team.team_members.length} member
                  {team.team_members.length === 1 ? '' : 's'}
                </span>
              </div>
              {team.description ? (
                <p className="text-sm text-slate-600">{team.description}</p>
              ) : null}
              {team.looking_for.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {team.looking_for.map((s) => (
                    <span
                      key={s}
                      className="badge bg-indigo-100 text-indigo-800"
                    >
                      looking for: {s}
                    </span>
                  ))}
                </div>
              )}
              <ul className="text-sm text-slate-600">
                {team.team_members.map((m) => (
                  <li key={m.user_id}>
                    {m.profiles?.full_name ?? 'Member'}
                    {m.role_in_team ? ` · ${m.role_in_team}` : ''}
                  </li>
                ))}
              </ul>

              {isRegistered && !myTeam && profile && (
                <form action={requestJoinTeam} className="flex gap-2">
                  <input type="hidden" name="team_id" value={team.id} />
                  <input type="hidden" name="event_id" value={event.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input
                    name="message"
                    className="input"
                    placeholder="I can help with…"
                  />
                  <button type="submit" className="btn-secondary shrink-0">
                    Ask to join
                  </button>
                </form>
              )}

              {isOwner && requests.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-2">
                  <p className="text-xs font-medium text-slate-500">
                    Pending requests
                  </p>
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        {r.profiles?.full_name ?? 'Someone'}
                        {r.message ? ` — ${r.message}` : ''}
                      </span>
                      <span className="flex gap-1">
                        <form action={respondToJoinRequest}>
                          <input type="hidden" name="request_id" value={r.id} />
                          <input type="hidden" name="decision" value="accept" />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button className="badge bg-emerald-100 text-emerald-800">
                            accept
                          </button>
                        </form>
                        <form action={respondToJoinRequest}>
                          <input type="hidden" name="request_id" value={r.id} />
                          <input type="hidden" name="decision" value="decline" />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button className="badge bg-red-100 text-red-800">
                            decline
                          </button>
                        </form>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
      {(teams ?? []).length === 0 && (
        <p className="card text-slate-500">
          No teams yet — create the first one.
        </p>
      )}
    </div>
  );
}
