"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PlusIcon } from "@/components/icons";
import { BannerDrawer } from "@/components/banner-drawer";
import { BannerRow } from "@/components/banner-row";
import {
  MAX_ACTIVE_BANNERS,
  deleteBanner,
  friendlyError,
  listBanners,
  listCategories,
  swapOrder,
  updateBanner,
  type Banner,
  type Category,
} from "@/lib/banners";

type Drawer = { mode: "new" } | { mode: "edit"; banner: Banner } | null;
type Toast = { id: number; kind: "ok" | "error"; text: string };

export function BannersManager() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [toDelete, setToDelete] = useState<Banner | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback((kind: Toast["kind"], text: string) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), kind, text });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [b, c] = await Promise.all([listBanners(), listCategories()]);
      setBanners(b);
      setCategories(c);
    } catch (e) {
      setLoadError(friendlyError(e));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
    return () => clearTimeout(toastTimer.current);
  }, [load]);

  const activeCount = useMemo(() => (banners ?? []).filter((b) => b.is_active).length, [banners]);
  const limitReached = activeCount >= MAX_ACTIVE_BANNERS;
  const nextOrder = useMemo(
    () => Math.max(0, ...(banners ?? []).map((b) => b.display_order)) + 1,
    [banners],
  );

  async function run(id: string, action: () => Promise<void>, success?: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      await action();
      if (success) notify("ok", success);
    } catch (e) {
      notify("error", friendlyError(e));
    } finally {
      // Always reload: the DB is the source of truth (another tab may have changed things).
      await load();
      setBusyId(null);
    }
  }

  const onToggle = (b: Banner) =>
    run(b.id, () => updateBanner(b.id, { is_active: !b.is_active }), b.is_active ? "Banner deactivated." : "Banner activated.");

  const onMove = (index: number, dir: -1 | 1) => {
    const list = banners ?? [];
    const a = list[index];
    const other = list[index + dir];
    if (!a || !other) return;
    void run(a.id, () => swapOrder(a, other));
  };

  async function confirmDelete() {
    const target = toDelete;
    if (!target) return;
    setToDelete(null);
    await run(target.id, () => deleteBanner(target), "Banner deleted.");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banners</h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage promotional banners for the Rebix mobile app home screen.
          </p>
        </div>
        <button
          onClick={() => setDrawer({ mode: "new" })}
          disabled={!banners}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
        >
          <PlusIcon width={16} height={16} />
          Add banner
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-primary-100 bg-primary-50 px-5 py-4">
        <span className="font-semibold">Active banners</span>
        <span className="font-semibold tabular-nums">
          {activeCount} / {MAX_ACTIVE_BANNERS}
        </span>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: MAX_ACTIVE_BANNERS }, (_, i) => (
            <span
              key={i}
              className={`h-2 w-12 rounded-full ${i < activeCount ? "bg-primary-500" : "bg-primary-200"}`}
            />
          ))}
        </div>
        <span className="text-xs text-ink-600">
          Up to {MAX_ACTIVE_BANNERS} active banners. The app always shows 4: built-in ones fill any empty slots.
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <p>{loadError}</p>
            <button onClick={() => void load()} className="mt-3 rounded-lg bg-white px-4 py-2 font-medium shadow-sm">
              Try again
            </button>
          </div>
        ) : !banners ? (
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl border border-ink-200 bg-white" />
          ))
        ) : banners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-300 bg-white p-10 text-center">
            <p className="font-semibold">No banners yet</p>
            <p className="mt-1 text-sm text-ink-500">
              The app is showing its 4 built-in banners. Each banner you add replaces one of them.
            </p>
          </div>
        ) : (
          <>
            {activeCount === 0 && (
              <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                No banner is active, so the app is showing its 4 built-in banners.
              </p>
            )}
            {banners.map((b, i) => (
              <BannerRow
                key={b.id}
                banner={b}
                index={i}
                total={banners.length}
                busy={busyId === b.id}
                locked={busyId !== null}
                limitReached={limitReached}
                onToggle={() => void onToggle(b)}
                onEdit={() => setDrawer({ mode: "edit", banner: b })}
                onDelete={() => setToDelete(b)}
                onMove={(dir) => onMove(i, dir)}
              />
            ))}
          </>
        )}
      </div>

      {drawer && (
        <BannerDrawer
          // Remount per banner so form state never leaks between records.
          key={drawer.mode === "edit" ? drawer.banner.id : "new"}
          banner={drawer.mode === "edit" ? drawer.banner : null}
          categories={categories}
          activeCountExcludingSelf={activeCount - (drawer.mode === "edit" && drawer.banner.is_active ? 1 : 0)}
          defaultOrder={nextOrder}
          onClose={() => setDrawer(null)}
          onSaved={async (message) => {
            setDrawer(null);
            notify("ok", message);
            await load();
          }}
        />
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="alertdialog" aria-modal>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold">Delete this banner?</h2>
            <p className="mt-2 text-sm text-ink-600">
              &ldquo;{toDelete.title}&rdquo; and its image will be removed permanently. This can&apos;t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setToDelete(null)} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={() => void confirmDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.kind === "ok" ? "bg-primary-800" : "bg-red-600"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
