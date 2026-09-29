export async function Flash({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const msg = typeof sp.msg === 'string' ? sp.msg : null;
  const err = typeof sp.err === 'string' ? sp.err : null;
  if (!msg && !err) return null;
  return (
    <div
      className={`flash ${
        err
          ? 'border-red-300 bg-red-50 text-red-800'
          : 'border-emerald-300 bg-emerald-50 text-emerald-800'
      }`}
    >
      {msg ?? err}
    </div>
  );
}
