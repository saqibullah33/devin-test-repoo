'use server';

import { revalidatePath } from 'next/cache';

import { getEventAccess, requireProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { CertType } from '@/lib/types';
import { back, str } from './shared';

interface CertRow {
  event_id: string;
  user_id: string;
  type: CertType;
}

// Issues certificates for an event:
//  - participation → everyone checked in
//  - winner / runner_up → members of the top-2 teams by average judge total
//  - volunteer / speaker / judge → holders of those event roles
export async function issueCertificates(formData: FormData) {
  const profile = await requireProfile();
  const eventId = str(formData, 'event_id');
  const returnTo = str(formData, 'returnTo') || '/admin';

  const { data: event } = await supabase()
    .from('events')
    .select('organizer_id')
    .eq('id', eventId)
    .single();
  if (!event) back(returnTo, 'Event not found', true);
  const access = await getEventAccess(profile, eventId, event!.organizer_id);
  if (!access.canManage) back(returnTo, 'Not authorized', true);

  const rows: CertRow[] = [];

  const { data: checkins } = await supabase()
    .from('checkins')
    .select('user_id')
    .eq('event_id', eventId);
  for (const c of checkins ?? []) {
    rows.push({ event_id: eventId, user_id: c.user_id, type: 'participation' });
  }

  const { data: roles } = await supabase()
    .from('event_roles')
    .select('user_id, role')
    .eq('event_id', eventId);
  for (const r of roles ?? []) {
    rows.push({
      event_id: eventId,
      user_id: r.user_id,
      type: r.role as CertType,
    });
  }

  const { data: projects } = await supabase()
    .from('projects')
    .select('id, team_id')
    .eq('event_id', eventId);
  const { data: scores } = await supabase()
    .from('scores')
    .select('project_id, innovation, ux, technical, impact')
    .in(
      'project_id',
      (projects ?? []).map((p) => p.id),
    );

  const totals = new Map<string, { sum: number; n: number }>();
  for (const s of scores ?? []) {
    const t = totals.get(s.project_id) ?? { sum: 0, n: 0 };
    t.sum += s.innovation + s.ux + s.technical + s.impact;
    t.n += 1;
    totals.set(s.project_id, t);
  }
  const ranked = (projects ?? [])
    .map((p) => ({
      team_id: p.team_id,
      avg: totals.has(p.id) ? totals.get(p.id)!.sum / totals.get(p.id)!.n : 0,
    }))
    .sort((a, b) => b.avg - a.avg);

  const winningTeams = ranked.slice(0, 2);
  if (winningTeams.length > 0) {
    const { data: members } = await supabase()
      .from('team_members')
      .select('team_id, user_id')
      .in(
        'team_id',
        winningTeams.map((t) => t.team_id),
      );
    for (const m of members ?? []) {
      const type: CertType =
        m.team_id === winningTeams[0].team_id ? 'winner' : 'runner_up';
      rows.push({ event_id: eventId, user_id: m.user_id, type });
    }
  }

  if (rows.length === 0) back(returnTo, 'Nothing to issue yet', true);

  const { error } = await supabase()
    .from('certificates')
    .upsert(rows, { onConflict: 'event_id,user_id,type', ignoreDuplicates: true });
  if (error) back(returnTo, error.message, true);
  revalidatePath(returnTo);
  back(returnTo, `Issued certificates for ${rows.length} recipient/type pairs`);
}
