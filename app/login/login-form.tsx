"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ConfigMissing } from "@/components/config-missing";
import { Logo } from "@/components/logo";
import { friendlyError, isCurrentUserAdmin } from "@/lib/banners";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const URL_ERRORS: Record<string, string> = {
  not_admin: "This account doesn't have admin access.",
  session: "Your session expired. Please sign in again.",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(URL_ERRORS[params.get("error") ?? ""] ?? null);

  if (!isSupabaseConfigured) return <ConfigMissing />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        // Same message for wrong email / wrong password: don't reveal which accounts exist.
        const generic = signInError.status === 400 || /invalid login/i.test(signInError.message);
        throw new Error(generic ? "Incorrect email or password." : signInError.message);
      }
      if (!(await isCurrentUserAdmin())) {
        await supabase.auth.signOut();
        throw new Error(URL_ERRORS.not_admin);
      }
      router.replace("/banners");
      router.refresh();
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-8 shadow-sm"
    >
      <Logo />
      <h1 className="mt-6 text-xl font-bold">Sign in</h1>
      <p className="mt-1 text-sm text-ink-500">Admins only.</p>

      <label className="mt-6 block text-sm font-medium" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />

      <label className="mt-4 block text-sm font-medium" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
