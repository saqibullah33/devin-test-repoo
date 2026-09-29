import Link from 'next/link';

import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Certificate, Event, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

type CertRow = Certificate & {
  events: Pick<Event, 'name' | 'slug'> | null;
  profiles: Pick<Profile, 'full_name'> | null;
};

const CERT_LABELS: Record<string, string> = {
  participation: 'Certificate of Participation',
  winner: 'Winner Certificate',
  runner_up: 'Runner-up Certificate',
  volunteer: 'Volunteer Certificate',
  speaker: 'Speaker Certificate',
  judge: 'Judge Certificate',
};

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { data: cert } = await supabase()
    .from('certificates')
    .select('*, events(name, slug), profiles(full_name)')
    .eq('cert_code', code.toUpperCase())
    .maybeSingle<CertRow>();

  return (
    <div className="mx-auto max-w-md">
      {cert ? (
        <div className="card space-y-4 border-emerald-300 text-center">
          <span className="badge bg-emerald-100 text-emerald-800">
            Valid certificate
          </span>
          <div>
            <h1 className="text-xl font-bold">
              {CERT_LABELS[cert.type] ?? 'Certificate'}
            </h1>
            <p className="mt-2 text-lg">{cert.profiles?.full_name}</p>
            <p className="text-sm text-slate-500">
              {cert.events?.name} · issued {formatDate(cert.issued_at)}
            </p>
          </div>
          <p className="font-mono text-xs text-slate-400">
            ID: {cert.cert_code}
          </p>
          <a
            href={`/api/certificates/${cert.cert_code}/pdf`}
            className="btn-secondary inline-block"
          >
            Download PDF
          </a>
        </div>
      ) : (
        <div className="card space-y-3 border-red-300 text-center">
          <span className="badge bg-red-100 text-red-800">
            Invalid certificate
          </span>
          <p className="text-sm text-slate-600">
            No certificate matches code <code>{code}</code>.
          </p>
        </div>
      )}
      <p className="mt-4 text-center">
        <Link href="/" className="text-sm text-slate-500 underline">
          Gatherly
        </Link>
      </p>
    </div>
  );
}
