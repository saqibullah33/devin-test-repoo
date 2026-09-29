import { notFound } from 'next/navigation';

import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Certificate, Event, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

type CertRow = Certificate & { events: Pick<Event, 'name'> | null };

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ clerkId: string }>;
}) {
  const { clerkId } = await params;
  const { data: profile } = await supabase()
    .from('profiles')
    .select('*')
    .eq('clerk_id', clerkId)
    .maybeSingle<Profile>();
  if (!profile) notFound();

  const [{ count: attended }, { data: memberships }, { data: certs }] =
    await Promise.all([
      supabase()
        .from('checkins')
        .select('event_id', { count: 'exact', head: true })
        .eq('user_id', profile.id),
      supabase()
        .from('team_members')
        .select('team_id')
        .eq('user_id', profile.id),
      supabase()
        .from('certificates')
        .select('*, events(name)')
        .eq('user_id', profile.id)
        .order('issued_at', { ascending: false })
        .returns<CertRow[]>(),
    ]);

  const teamIds = (memberships ?? []).map((m) => m.team_id);
  const { count: submitted } =
    teamIds.length > 0
      ? await supabase()
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .in('team_id', teamIds)
      : { count: 0 };

  const wins = (certs ?? []).filter(
    (c) => c.type === 'winner' || c.type === 'runner_up',
  ).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="card flex items-start gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            className="h-16 w-16 rounded-full"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-slate-500">
            {profile.full_name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name}</h1>
          {profile.headline && (
            <p className="text-slate-600">{profile.headline}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Member since {formatDate(profile.created_at)}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'events attended', value: attended ?? 0 },
          { label: 'projects submitted', value: submitted ?? 0 },
          { label: 'hackathon wins', value: wins },
        ].map((s) => (
          <div key={s.label} className="card">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </section>

      {profile.skills.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">Skills</h2>
          <div className="flex flex-wrap gap-1">
            {profile.skills.map((s) => (
              <span key={s} className="badge bg-slate-100 text-slate-700">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {(certs ?? []).length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">Certificates</h2>
          <ul className="space-y-1 text-sm">
            {certs!.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>
                  <span className="capitalize">{c.type.replace('_', ' ')}</span>
                  <span className="text-slate-500"> — {c.events?.name}</span>
                </span>
                <a
                  href={`/verify/${c.cert_code}`}
                  className="font-mono text-xs text-indigo-600 underline"
                >
                  {c.cert_code}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
