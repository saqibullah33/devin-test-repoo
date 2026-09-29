import { Flash } from '@/components/flash';
import { updateProfile } from '@/lib/actions/profiles';
import { requireProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Flash searchParams={searchParams} />
      <h1 className="text-2xl font-bold">Edit profile</h1>
      <form action={updateProfile} className="card grid gap-4">
        <input type="hidden" name="returnTo" value="/dashboard/profile" />
        <div>
          <label className="label" htmlFor="full_name">Full name</label>
          <input
            id="full_name"
            name="full_name"
            className="input"
            defaultValue={profile.full_name}
          />
        </div>
        <div>
          <label className="label" htmlFor="headline">
            Headline (e.g. Full Stack Developer)
          </label>
          <input
            id="headline"
            name="headline"
            className="input"
            defaultValue={profile.headline}
          />
        </div>
        <div>
          <label className="label" htmlFor="skills">
            Skills (comma-separated)
          </label>
          <input
            id="skills"
            name="skills"
            className="input"
            placeholder="TypeScript, React, Postgres"
            defaultValue={profile.skills.join(', ')}
          />
        </div>
        <button type="submit" className="btn">Save</button>
      </form>
    </div>
  );
}
