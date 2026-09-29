'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getEventAccess, isAdmin, requireProfile } from '@/lib/auth';
import { slugify } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { EventRoleKind, EventStatus } from '@/lib/types';
import { back, intOrNull, str } from './shared';

export async function createEvent(formData: FormData) {
  const profile = await requireProfile();
  const name = str(formData, 'name');
  if (!name) back('/admin/events/new', 'Name is required', true);

  const baseSlug = slugify(name) || 'event';
  let slug = baseSlug;
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase()
      .from('events')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!data) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: event, error } = await supabase()
    .from('events')
    .insert({
      slug,
      name,
      description: str(formData, 'description'),
      venue: str(formData, 'venue'),
      starts_at: str(formData, 'starts_at') || null,
      ends_at: str(formData, 'ends_at') || null,
      capacity: intOrNull(formData, 'capacity'),
      status: 'draft' satisfies EventStatus,
      organizer_id: profile.id,
    })
    .select('id')
    .single();
  if (error || !event) back('/admin/events/new', error?.message ?? 'Failed', true);
  redirect(`/admin/events/${event!.id}?msg=${encodeURIComponent('Event created — publish it when ready')}`);
}

async function requireManager(eventId: string) {
  const profile = await requireProfile();
  const { data: event } = await supabase()
    .from('events')
    .select('organizer_id')
    .eq('id', eventId)
    .single();
  if (!event) back('/admin', 'Event not found', true);
  const access = await getEventAccess(profile, eventId, event!.organizer_id);
  if (!access.canManage) back('/admin', 'Not authorized', true);
  return profile;
}

export async function updateEvent(formData: FormData) {
  const eventId = str(formData, 'event_id');
  const returnTo = str(formData, 'returnTo') || '/admin';
  await requireManager(eventId);

  const { error } = await supabase()
    .from('events')
    .update({
      name: str(formData, 'name'),
      description: str(formData, 'description'),
      venue: str(formData, 'venue'),
      starts_at: str(formData, 'starts_at') || null,
      ends_at: str(formData, 'ends_at') || null,
      capacity: intOrNull(formData, 'capacity'),
    })
    .eq('id', eventId);
  if (error) back(returnTo, error.message, true);
  revalidatePath(returnTo);
  back(returnTo, 'Event updated');
}

export async function setEventStatus(formData: FormData) {
  const eventId = str(formData, 'event_id');
  const status = str(formData, 'status') as EventStatus;
  const returnTo = str(formData, 'returnTo') || '/admin';
  if (!['draft', 'published', 'completed', 'cancelled'].includes(status)) {
    back(returnTo, 'Invalid status', true);
  }
  await requireManager(eventId);
  const { error } = await supabase()
    .from('events')
    .update({ status })
    .eq('id', eventId);
  if (error) back(returnTo, error.message, true);
  revalidatePath(returnTo);
  back(returnTo, `Event ${status}`);
}

export async function addAnnouncement(formData: FormData) {
  const eventId = str(formData, 'event_id');
  const body = str(formData, 'body');
  const returnTo = str(formData, 'returnTo') || '/admin';
  if (!body) back(returnTo, 'Announcement is empty', true);
  await requireManager(eventId);
  const { error } = await supabase()
    .from('announcements')
    .insert({ event_id: eventId, body });
  if (error) back(returnTo, error.message, true);
  revalidatePath(returnTo);
  back(returnTo, 'Announcement posted');
}

export async function assignEventRole(formData: FormData) {
  const eventId = str(formData, 'event_id');
  const email = str(formData, 'email').toLowerCase();
  const role = str(formData, 'role') as EventRoleKind;
  const returnTo = str(formData, 'returnTo') || '/admin';
  if (!['judge', 'volunteer', 'speaker'].includes(role)) {
    back(returnTo, 'Invalid role', true);
  }
  await requireManager(eventId);

  const { data: target } = await supabase()
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  if (!target) back(returnTo, `No user with email ${email}`, true);

  const { error } = await supabase()
    .from('event_roles')
    .upsert({ event_id: eventId, user_id: target!.id, role });
  if (error) back(returnTo, error.message, true);
  revalidatePath(returnTo);
  back(returnTo, `${email} added as ${role}`);
}

export async function removeEventRole(formData: FormData) {
  const eventId = str(formData, 'event_id');
  const userId = str(formData, 'user_id');
  const role = str(formData, 'role');
  const returnTo = str(formData, 'returnTo') || '/admin';
  await requireManager(eventId);
  await supabase()
    .from('event_roles')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('role', role);
  revalidatePath(returnTo);
  back(returnTo, 'Role removed');
}

export async function listMyEvents() {
  const profile = await requireProfile();
  const { data: organized } = await supabase()
    .from('events')
    .select('*')
    .eq('organizer_id', profile.id)
    .order('starts_at', { ascending: false, nullsFirst: false });
  if (isAdmin(profile)) {
    const { data: all } = await supabase()
      .from('events')
      .select('*')
      .order('starts_at', { ascending: false, nullsFirst: false });
    return all ?? [];
  }
  return organized ?? [];
}
