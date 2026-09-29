import 'server-only';

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import type { EventRoleKind, Profile } from '@/lib/types';

export type StaffRole = 'organizer' | 'admin' | 'judge' | 'volunteer' | 'speaker';

export async function getCurrentProfile(): Promise<Profile | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const { data } = await supabase()
    .from('profiles')
    .select('*')
    .eq('clerk_id', userId)
    .maybeSingle<Profile>();
  if (data) return data;

  const user = await currentUser();
  if (!user) return null;

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.username ||
    'Member';
  const { data: created, error } = await supabase()
    .from('profiles')
    .insert({
      clerk_id: userId,
      email: user.primaryEmailAddress?.emailAddress ?? '',
      full_name: fullName,
      avatar_url: user.imageUrl,
    })
    .select()
    .single<Profile>();
  if (created) return created;
  if (error && error.code !== '23505') throw error;

  const { data: raced } = await supabase()
    .from('profiles')
    .select('*')
    .eq('clerk_id', userId)
    .single<Profile>();
  return raced;
}

export async function requireProfile(): Promise<Profile> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const profile = await getCurrentProfile();
  if (!profile) redirect('/sign-in');
  return profile;
}

export function isAdmin(profile: Profile): boolean {
  const envAdmins = (process.env.ADMIN_CLERK_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return profile.is_admin || envAdmins.includes(profile.clerk_id);
}

export interface EventAccess {
  isOrganizer: boolean;
  isAdmin: boolean;
  roles: EventRoleKind[];
  canManage: boolean;
  canCheckin: boolean;
  isJudge: boolean;
}

export async function getEventAccess(
  profile: Profile | null,
  eventId: string,
  organizerId: string,
): Promise<EventAccess> {
  const base: EventAccess = {
    isOrganizer: false,
    isAdmin: false,
    roles: [],
    canManage: false,
    canCheckin: false,
    isJudge: false,
  };
  if (!profile) return base;

  base.isOrganizer = profile.id === organizerId;
  base.isAdmin = isAdmin(profile);

  const { data } = await supabase()
    .from('event_roles')
    .select('role')
    .eq('event_id', eventId)
    .eq('user_id', profile.id);
  base.roles = (data ?? []).map((r: { role: EventRoleKind }) => r.role);

  base.canManage = base.isOrganizer || base.isAdmin;
  base.canCheckin =
    base.canManage || base.roles.includes('volunteer');
  base.isJudge = base.roles.includes('judge');
  return base;
}

export async function requireEventManager(
  eventId: string,
): Promise<{ profile: Profile; organizerId: string }> {
  const profile = await requireProfile();
  const { data: event } = await supabase()
    .from('events')
    .select('organizer_id')
    .eq('id', eventId)
    .single();
  if (!event) redirect('/');
  const access = await getEventAccess(profile, eventId, event.organizer_id);
  if (!access.canManage) redirect('/');
  return { profile, organizerId: event.organizer_id };
}
