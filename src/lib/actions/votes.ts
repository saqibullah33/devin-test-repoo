'use server';

import { revalidatePath } from 'next/cache';

import { requireProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { back, str } from './shared';

export async function castVote(formData: FormData) {
  const profile = await requireProfile();
  const eventId = str(formData, 'event_id');
  const projectId = str(formData, 'project_id');
  const returnTo = str(formData, 'returnTo') || '/';

  const { data: reg } = await supabase()
    .from('registrations')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', profile.id)
    .maybeSingle();
  if (!reg || reg.status === 'cancelled') {
    back(returnTo, 'Only registered attendees can vote', true);
  }

  const { data: project } = await supabase()
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('event_id', eventId)
    .maybeSingle();
  if (!project) back(returnTo, 'Project not found', true);

  // One vote per attendee per event; revoting switches their pick.
  const { error } = await supabase().from('votes').upsert(
    {
      event_id: eventId,
      project_id: projectId,
      voter_id: profile.id,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'event_id,voter_id' },
  );
  if (error) back(returnTo, error.message, true);
  revalidatePath(returnTo);
  back(returnTo, `Vote cast for ${project!.name}`);
}
