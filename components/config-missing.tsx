export function ConfigMissing() {
  return (
    <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-semibold">Supabase isn&apos;t configured.</p>
      <p className="mt-1">
        Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (in{" "}
        <code>.env.local</code> locally, or in Vercel → Project Settings → Environment Variables) and redeploy.
      </p>
    </div>
  );
}
