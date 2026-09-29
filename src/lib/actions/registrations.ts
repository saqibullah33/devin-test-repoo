'use server';

import { revalidatePath } from 'next/cache';

import { getEventAccess, requireProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { back, str } from './shared';

export async function registerForEvent(formData: FormData) {
  const profile = await requireProfile();
  const eventId = str(formData, 'event_id');
  const returnTo = str(formData, 'returnTo') || '/';

  const { data: event } = await supabase()
    .from('events')
    .select('slug, status, capacity')
    .eq('id', eventId)
    .single();
  if (!event || event.status !== 'published') {
    back(returnTo, 'Registration is not open', true);
  }

  const { data: existing } = await supabase()
    .from('registrations')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', profile.id)
    .maybeSingle();
  if (existing && existing.status !== 'cancelled') {
    back(returnTo, 'You are already registered', true);
  }

  let status: 'registered' | 'waitlisted' = 'registered';
  if (event!.capacity != null) {
    const { count } = await supabase()
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'registered');
    if ((count ?? 0) >= event!.capacity) status = 'waitlisted';
  }

  const { error } = await supabase().from('registrations').upsert(
    {
      event_id: eventId,
      user_id: profile.id,
      status,
      form_data: { note: str(formData, 'note') },
    },
    { onConflict: 'event_id,user_id' },
  );
  if (error) back(returnTo, error.message, true);
  revalidatePath(returnTo);
  back(
    returnTo,
    status === 'registered'
      ? 'You are registered — your QR ticket is on the event page'
      : 'Event is full — you are on the waitlist',
  );
}

export async function cancelRegistration(formData: FormData) {
  const profile = await requireProfile();
  const eventId = str(formData, 'event_id');
  const returnTo = str(formData, 'returnTo') || '/';
  await supabase()
    .from('registrations')
    .update({ status: 'cancelled' })
    .eq('event_id', eventId)
    .eq('user_id', profile.id);
  revalidatePath(returnTo);
  back(returnTo, 'Registration cancelled');
}

export interface CheckinResult {
  ok: boolean;
  message: string;
}

// Called from the staff scanner page. Any organizer/admin/volunteer for the
// event may check attendees in.
export async function checkinByTicket(
  ticketCode: string,
): Promise<CheckinResult> {
  const profile = await requireProfile();
  const code = ticketCode.trim();
  if (!code) return { ok: false, message: 'Empty code' };

  const { data: reg } = await supabase()
    .from('registrations')
    .select('event_id, user_id, status, events(name), profiles(full_name)')
    .eq('ticket_code', code)
    .maybeSingle();
  if (!reg) return { ok: false, message: 'Ticket not found' };
  if (reg.status === 'cancelled') {
    return { ok: false, message: 'Registration was cancelled' };
  }

  const { data: event } = await supabase()
    .from('events')
    .select('organizer_id')
    .eq('id', reg.event_id)
    .single();
  const access = await getEventAccess(profile, reg.event_id, event?.organizer_id ?? '');
  if (!access.canCheckin) {
    return { ok: false, message: 'You are not event staff' };
  }

  const attendee =
    (reg as unknown as { profiles: { full_name: string } | null }).profiles
      ?.full_name ?? 'Attendee';

  const { error } = await supabase()
    .from('checkins')
    .insert({
      event_id: reg.event_id,
      user_id: reg.user_id,
      checked_in_by: profile.id,
    });
  if (error?.code === '23505') {
    return { ok: true, message: `${attendee} — already checked in` };
  }
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `${attendee} checked in` };
}
