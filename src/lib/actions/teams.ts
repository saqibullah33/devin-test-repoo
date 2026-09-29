'use server';

import { revalidatePath } from 'next/cache';

import { requireProfile } from '@/lib/auth';
import { parseTags } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { back, str } from './shared';

async function requireRegistered(eventId: string, userId: string, returnTo: string) {
  const { data: reg } = await supabase()
    .from('registrations')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!reg || reg.status === 'cancelled') {
    back(returnTo, 'Register for the event first', true);
  }
}

export async function createTeam(formData: FormData) {
  const profile = await requireProfile();
  const eventId = str(formData, 'event_id');
  const returnTo = str(formData, 'returnTo') || '/';
  await requireRegistered(eventId, profile.id, returnTo);

  const name = str(formData, 'name');
  if (!name) back(returnTo, 'Team name is required', true);

  const { data: team, error } = await supabase()
    .from('teams')
    .insert({
      event_id: eventId,
      name,
      description: str(formData, 'description'),
      looking_for: parseTags(str(formData, 'looking_for')),
      created_by: profile.id,
    })
    .select('id')
    .single();
  if (error || !team) back(returnTo, error?.message ?? 'Failed', true);

  const { error: memberErr } = await supabase().from('team_members').insert({
    team_id: team!.id,
    event_id: eventId,
    user_id: profile.id,
    role_in_team: 'lead',
  });
  if (memberErr?.code === '23505') {
    back(returnTo, 'You are already in a team for this event', true);
  }
  if (memberErr) back(returnTo, memberErr.message, true);
  revalidatePath(returnTo);
  back(returnTo, `Team "${name}" created`);
}

export async function requestJoinTeam(formData: FormData) {
  const profile = await requireProfile();
  const teamId = str(formData, 'team_id');
  const eventId = str(formData, 'event_id');
  const returnTo = str(formData, 'returnTo') || '/';
  await requireRegistered(eventId, profile.id, returnTo);

  const { data: membership } = await supabase()
    .from('team_members')
    .select('team_id')
    .eq('event_id', eventId)
    .eq('user_id', profile.id)
    .maybeSingle();
  if (membership) back(returnTo, 'You are already in a team', true);

  const { error } = await supabase().from('join_requests').upsert(
    {
      team_id: teamId,
      user_id: profile.id,
      message: str(formData, 'message'),
      status: 'pending',
    },
    { onConflict: 'team_id,user_id' },
  );
  if (error) back(returnTo, error.message, true);
  revalidatePath(returnTo);
  back(returnTo, 'Join request sent');
}

export async function respondToJoinRequest(formData: FormData) {
  const profile = await requireProfile();
  const requestId = str(formData, 'request_id');
  const decision = str(formData, 'decision');
  const returnTo = str(formData, 'returnTo') || '/';

  const { data: req } = await supabase()
    .from('join_requests')
    .select('team_id, user_id, status, teams(event_id, created_by)')
    .eq('id', requestId)
    .single();
  if (!req) back(returnTo, 'Request not found', true);
  const team = (req as unknown as { teams: { event_id: string; created_by: string } })
    .teams;
  if (team.created_by !== profile.id) back(returnTo, 'Only the team lead can respond', true);
  if (req.status !== 'pending') back(returnTo, 'Already handled', true);

  if (decision === 'accept') {
    const { error } = await supabase().from('team_members').insert({
      team_id: req.team_id,
      event_id: team.event_id,
      user_id: req.user_id,
      role_in_team: str(formData, 'role_in_team') || 'member',
    });
    if (error?.code === '23505') {
      back(returnTo, 'That person is already in a team', true);
    }
    if (error) back(returnTo, error.message, true);
    await supabase()
      .from('join_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);
    revalidatePath(returnTo);
    back(returnTo, 'Member added');
  }

  await supabase()
    .from('join_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);
  revalidatePath(returnTo);
  back(returnTo, 'Request declined');
}

export async function leaveTeam(formData: FormData) {
  const profile = await requireProfile();
  const teamId = str(formData, 'team_id');
  const returnTo = str(formData, 'returnTo') || '/';
  await supabase()
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', profile.id);
  revalidatePath(returnTo);
  back(returnTo, 'Left team');
}
