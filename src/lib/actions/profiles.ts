'use server';

import { revalidatePath } from 'next/cache';

import { requireProfile } from '@/lib/auth';
import { parseTags } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { back, str } from './shared';

export async function updateProfile(formData: FormData) {
  const profile = await requireProfile();
  const returnTo = str(formData, 'returnTo') || '/dashboard/profile';

  const { error } = await supabase()
    .from('profiles')
    .update({
      full_name: str(formData, 'full_name') || profile.full_name,
      headline: str(formData, 'headline'),
      skills: parseTags(str(formData, 'skills')),
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);
  if (error) back(returnTo, error.message, true);
  revalidatePath(returnTo);
  revalidatePath(`/u/${profile.clerk_id}`);
  back(returnTo, 'Profile updated');
}
