"use client";

import type { AuthChangeEvent } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { ConfigMissing } from "@/components/config-missing";
import { ImageIcon, SignOutIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { friendlyError, isCurrentUserAdmin } from "@/lib/banners";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Gate = { state: "checking" } | { state: "ok"; email: string } | { state: "error"; message: string };

/**
 * Wraps every admin page. Re-verifies on the client that the session is real and belongs to an admin
 * (the proxy only does a cheap check). Data is protected by RLS regardless.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>({ state: "checking" });

  const check = useCallback(async () => {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        // A missing/expired session is "signed out"; anything else (network) is a retryable error.
        if (error && !/session|jwt|token|not authenticated/i.test(error.message) && error.status !== 401 && error.status !== 403) {
          throw error;
        }
        router.replace("/login?error=session");
        return;
      }
      if (!(await isCurrentUserAdmin())) {
        await supabase.auth.signOut();
        router.replace("/login?error=not_admin");
        return;
      }
      setGate({ state: "ok", email: data.user.email ?? "admin" });
    } catch (e) {
      setGate({ state: "error", message: friendlyError(e) });
    }
  }, [router]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async session check on mount
    void check();
    // Signed out in another tab, or the refresh token died.
    const { data } = getSupabase().auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });
    return () => data.subscription.unsubscribe();
  }, [check, router]);

  async function signOut() {
    await getSupabase().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (!isSupabaseConfigured) return <ConfigMissing />;

  if (gate.state !== "ok") {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-ink-500">
        {gate.state === "checking" ? (
          "Checking your session…"
        ) : (
          <div className="text-center">
            <p className="text-red-700">{gate.message}</p>
            <button
              onClick={() => {
                setGate({ state: "checking" });
                void check();
              }}
              className="mt-3 rounded-lg border border-ink-200 bg-white px-4 py-2 font-medium text-ink-800"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  const initial = gate.email.charAt(0).toUpperCase();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-ink-200 bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block md:px-6 md:py-6">
          <Logo />
          <button
            onClick={() => void signOut()}
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 md:hidden"
          >
            Sign out
          </button>
        </div>
        <nav className="px-3 pb-3 md:pb-0">
          <span
            aria-current="page"
            className="flex items-center gap-3 rounded-lg bg-primary-50 px-3 py-2.5 text-sm font-semibold text-primary-800"
          >
            <ImageIcon />
            Banners
          </span>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden items-center justify-end gap-3 border-b border-ink-200 bg-white px-8 py-3 md:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-700 text-sm font-semibold text-white">
            {initial}
          </div>
          <span className="max-w-60 truncate text-sm font-medium">{gate.email}</span>
          <button
            onClick={() => void signOut()}
            className="ml-2 inline-flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            <SignOutIcon width={15} height={15} />
            Sign out
          </button>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
