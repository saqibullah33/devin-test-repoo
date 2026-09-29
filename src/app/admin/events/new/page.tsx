import { Flash } from '@/components/flash';
import { createEvent } from '@/lib/actions/events';
import { requireProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireProfile();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Flash searchParams={searchParams} />
      <h1 className="text-2xl font-bold">Create an event</h1>
      <form action={createEvent} className="card grid gap-4">
        <div>
          <label className="label" htmlFor="name">Event name</label>
          <input id="name" name="name" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" className="input" rows={4} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="starts_at">Starts</label>
            <input
              id="starts_at"
              name="starts_at"
              type="datetime-local"
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="ends_at">Ends</label>
            <input
              id="ends_at"
              name="ends_at"
              type="datetime-local"
              className="input"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="venue">Venue</label>
            <input id="venue" name="venue" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="capacity">
              Capacity (empty = unlimited)
            </label>
            <input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              className="input"
            />
          </div>
        </div>
        <button type="submit" className="btn">Create event</button>
      </form>
    </div>
  );
}
