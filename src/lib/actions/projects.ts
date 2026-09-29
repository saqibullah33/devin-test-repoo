'use server';

import { revalidatePath } from 'next/cache';

import { requireProfile } from '@/lib/auth';
import { parseTags } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { back, str } from './shared';

export async function submitProject(formData: FormData) {
  const profile = await requireProfile();
  const eventId = str(formData, 'event_id');
  const returnTo = str(formData, 'returnTo') || '/';

  const { data: membership } = await supabase()
    .from('team_members')
    .select('team_id')
    .eq('event_id', eventId)
    .eq('user_id', profile.id)
    .maybeSingle();
  if (!membership) back(returnTo, 'Join a team before submitting', true);

  const name = str(formData, 'name');
  if (!name) back(returnTo, 'Project name is required', true);

  const { error } = await supabase().from('projects').upsert(
    {
      event_id: eventId,
      team_id: membership!.team_id,
      name,
      description: str(formData, 'description'),
      repo_url: str(formData, 'repo_url') || null,
      demo_url: str(formData, 'demo_url') || null,
      video_url: str(formData, 'video_url') || null,
      image_url: str(formData, 'image_url') || null,
      technologies: parseTags(str(formData, 'technologies')),
      submitted_by: profile.id,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'event_id,team_id' },
  );
  if (error) back(returnTo, error.message, true);
  revalidatePath(returnTo);
  back(returnTo, `Project "${name}" submitted`);
}
