import Link from 'next/link';
import { notFound } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import type { Event, Project, Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

type ProjectRow = Project & { teams: Pick<Team, 'name'> | null };

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: event } = await supabase()
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<Event>();
  if (!event || event.status === 'draft') notFound();

  const { data: projects } = await supabase()
    .from('projects')
    .select('*, teams(name)')
    .eq('event_id', event.id)
    .order('submitted_at')
    .returns<ProjectRow[]>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects — {event.name}</h1>
        <Link href={`/e/${slug}`} className="text-sm text-slate-500 underline">
          Back to event
        </Link>
      </div>
      {(projects ?? []).length === 0 && (
        <p className="card text-slate-500">No submissions yet.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {(projects ?? []).map((p) => (
          <div key={p.id} className="card space-y-2">
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.image_url}
                alt={p.name}
                className="h-36 w-full rounded-md object-cover"
              />
            ) : null}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{p.name}</h3>
              <span className="badge bg-slate-100 text-slate-600">
                {p.teams?.name ?? 'Team'}
              </span>
            </div>
            <p className="text-sm text-slate-600">{p.description}</p>
            {p.technologies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.technologies.map((t) => (
                  <span key={t} className="badge bg-slate-100 text-slate-600">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-3 text-sm">
              {p.repo_url && (
                <a href={p.repo_url} target="_blank" className="text-indigo-600 underline">
                  Repo
                </a>
              )}
              {p.demo_url && (
                <a href={p.demo_url} target="_blank" className="text-indigo-600 underline">
                  Live demo
                </a>
              )}
              {p.video_url && (
                <a href={p.video_url} target="_blank" className="text-indigo-600 underline">
                  Video
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
