import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Flash } from '@/components/flash';
import { saveScore } from '@/lib/actions/scoring';
import { getEventAccess, requireProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Event, Project, Score, Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

type ProjectRow = Project & { teams: Pick<Team, 'name'> | null };

export default async function JudgePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const profile = await requireProfile();

  const { data: event } = await supabase()
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<Event>();
  if (!event || event.status === 'draft') notFound();

  const access = await getEventAccess(profile, event.id, event.organizer_id);
  if (!access.isJudge && !access.canManage) {
    redirect(`/e/${slug}?err=${encodeURIComponent('Judges only')}`);
  }

  const [{ data: projects }, { data: myScores }] = await Promise.all([
    supabase()
      .from('projects')
      .select('*, teams(name)')
      .eq('event_id', event.id)
      .order('submitted_at')
      .returns<ProjectRow[]>(),
    supabase()
      .from('scores')
      .select('*')
      .eq('judge_id', profile.id)
      .returns<Score[]>(),
  ]);

  const scoreByProject = new Map((myScores ?? []).map((s) => [s.project_id, s]));
  const returnTo = `/e/${slug}/judge`;
  const criteria = ['innovation', 'ux', 'technical', 'impact'] as const;

  return (
    <div className="space-y-6">
      <Flash searchParams={searchParams} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Judging — {event.name}</h1>
        <Link href={`/e/${slug}`} className="text-sm text-slate-500 underline">
          Back to event
        </Link>
      </div>
      {(projects ?? []).length === 0 && (
        <p className="card text-slate-500">No submissions yet.</p>
      )}
      <div className="space-y-4">
        {(projects ?? []).map((p) => {
          const s = scoreByProject.get(p.id);
          const total = s ? s.innovation + s.ux + s.technical + s.impact : null;
          return (
            <div key={p.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs text-slate-500">
                    {p.teams?.name ?? 'Team'}
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  {p.repo_url && (
                    <a href={p.repo_url} target="_blank" className="text-indigo-600 underline">
                      Repo
                    </a>
                  )}
                  {p.demo_url && (
                    <a href={p.demo_url} target="_blank" className="text-indigo-600 underline">
                      Demo
                    </a>
                  )}
                  {p.video_url && (
                    <a href={p.video_url} target="_blank" className="text-indigo-600 underline">
                      Video
                    </a>
                  )}
                  {total != null && (
                    <span className="badge bg-sky-100 text-sky-800">
                      total {total}/40
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-600">{p.description}</p>
              <form
                action={saveScore}
                className="grid grid-cols-2 items-end gap-3 sm:grid-cols-5"
              >
                <input type="hidden" name="event_id" value={event.id} />
                <input type="hidden" name="project_id" value={p.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                {criteria.map((c) => (
                  <div key={c}>
                    <label className="label capitalize" htmlFor={`${p.id}-${c}`}>
                      {c}
                    </label>
                    <input
                      id={`${p.id}-${c}`}
                      name={c}
                      type="number"
                      min={0}
                      max={10}
                      required
                      className="input"
                      defaultValue={s?.[c]}
                    />
                  </div>
                ))}
                <button type="submit" className="btn-secondary">
                  Save
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
