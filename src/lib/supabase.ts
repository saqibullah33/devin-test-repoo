import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-side client using the secret key (bypasses RLS — all authorization
// is enforced in server actions / route handlers via Clerk).
// Never import this module from client components.
let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see .env.example',
      );
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
