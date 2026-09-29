import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Flash } from '@/components/flash';
import { submitProject } from '@/lib/actions/projects';
import { requireProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Event, Project, Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SubmitPage({
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

  const { data: membership } = await supabase()
    .from('team_members')
    .select('team_id, teams(name)')
    .eq('event_id', event.id)
    .eq('user_id', profile.id)
    .maybeSingle();
  if (!membership) redirect(`/e/${slug}/teams?err=${encodeURIComponent('Join or create a team first')}`);

  const { data: existing } = await supabase()
    .from('projects')
    .select('*')
    .eq('event_id', event.id)
    .eq('team_id', membership.team_id)
    .maybeSingle<Project>();

  const returnTo = `/e/${slug}/submit`;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Flash searchParams={searchParams} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {existing ? 'Update submission' : 'Submit your project'}
        </h1>
        <Link href={`/e/${slug}`} className="text-sm text-slate-500 underline">
          Back to event
        </Link>
      </div>
      <p className="text-sm text-slate-600">
        Team:{' '}
        {(membership as unknown as { teams: Pick<Team, 'name'> }).teams?.name}
      </p>

      <form action={submitProject} className="card grid gap-4">
        <input type="hidden" name="event_id" value={event.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <div>
          <label className="label" htmlFor="name">Project name</label>
          <input
            id="name"
            name="name"
            className="input"
            required
            defaultValue={existing?.name}
          />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            className="input"
            rows={4}
            defaultValue={existing?.description}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="repo_url">GitHub URL</label>
            <input
              id="repo_url"
              name="repo_url"
              type="url"
              className="input"
              defaultValue={existing?.repo_url ?? ''}
            />
          </div>
          <div>
            <label className="label" htmlFor="demo_url">Live demo URL</label>
            <input
              id="demo_url"
              name="demo_url"
              type="url"
              className="input"
              defaultValue={existing?.demo_url ?? ''}
            />
          </div>
          <div>
            <label className="label" htmlFor="video_url">Demo video URL</label>
            <input
              id="video_url"
              name="video_url"
              type="url"
              className="input"
              defaultValue={existing?.video_url ?? ''}
            />
          </div>
          <div>
            <label className="label" htmlFor="image_url">Screenshot URL</label>
            <input
              id="image_url"
              name="image_url"
              type="url"
              className="input"
              defaultValue={existing?.image_url ?? ''}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="technologies">
            Technologies (comma-separated)
          </label>
          <input
            id="technologies"
            name="technologies"
            className="input"
            placeholder="Next.js, Supabase, Tailwind"
            defaultValue={existing?.technologies.join(', ')}
          />
        </div>
        <button type="submit" className="btn">
          {existing ? 'Update project' : 'Submit project'}
        </button>
      </form>
    </div>
  );
}
