'use server';

import { revalidatePath } from 'next/cache';

import { getEventAccess, requireProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { back, intOrNull, str } from './shared';

export async function saveScore(formData: FormData) {
  const profile = await requireProfile();
  const eventId = str(formData, 'event_id');
  const projectId = str(formData, 'project_id');
  const returnTo = str(formData, 'returnTo') || '/';

  const { data: event } = await supabase()
    .from('events')
    .select('organizer_id')
    .eq('id', eventId)
    .single();
  const access = await getEventAccess(
    profile,
    eventId,
    event?.organizer_id ?? '',
  );
  if (!access.isJudge && !access.canManage) {
    back(returnTo, 'Only judges can score projects', true);
  }

  const fields = ['innovation', 'ux', 'technical', 'impact'] as const;
  const score: Record<(typeof fields)[number], number> = {
    innovation: 0,
    ux: 0,
    technical: 0,
    impact: 0,
  };
  for (const f of fields) {
    const v = intOrNull(formData, f);
    if (v == null || v < 0 || v > 10) {
      back(returnTo, `${f} must be 0–10`, true);
    }
    score[f] = v!;
  }

  const { error } = await supabase().from('scores').upsert(
    {
      judge_id: profile.id,
      project_id: projectId,
      ...score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'judge_id,project_id' },
  );
  if (error) back(returnTo, error.message, true);
  revalidatePath(returnTo);
  back(returnTo, 'Scores saved');
}
