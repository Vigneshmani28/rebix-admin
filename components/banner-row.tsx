"use client";

import { BannerPreview } from "@/components/banner-preview";
import { CalendarIcon, ChevronDownIcon, ChevronUpIcon, CursorIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { ACTION_LABELS, bannerStatus, formatDate, imageUrl, type Banner, type Status } from "@/lib/banners";

const STATUS_STYLE: Record<Status, { label: string; cls: string; dot: string }> = {
  live: { label: "Live", cls: "bg-primary-50 text-primary-700", dot: "bg-primary-500" },
  scheduled: { label: "Scheduled", cls: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  expired: { label: "Expired", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  inactive: { label: "Inactive", cls: "bg-ink-100 text-ink-500", dot: "bg-ink-400" },
};

interface Props {
  banner: Banner;
  index: number;
  total: number;
  busy: boolean;
  locked: boolean;
  limitReached: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

export function BannerRow({ banner, index, total, busy, locked, limitReached, onToggle, onEdit, onDelete, onMove }: Props) {
  const status = STATUS_STYLE[bannerStatus(banner)];
  const cannotActivate = !banner.is_active && limitReached;
  const dates =
    banner.start_date || banner.end_date
      ? `${banner.start_date ? formatDate(banner.start_date) : "Now"} – ${banner.end_date ? formatDate(banner.end_date) : "No end date"}`
      : "Always shown";

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50 hover:text-ink-900 disabled:opacity-40";

  return (
    <article
      className={`rounded-2xl border border-ink-200 bg-white p-4 shadow-sm transition hover:shadow-md ${busy ? "pointer-events-none opacity-60" : ""}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-0.5 pt-1">
            <button aria-label="Move up" disabled={locked || index === 0} onClick={() => onMove(-1)} className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-800 disabled:opacity-30">
              <ChevronUpIcon width={16} height={16} />
            </button>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink-100 text-xs font-semibold" title="Display order">
              {banner.display_order}
            </span>
            <button aria-label="Move down" disabled={locked || index === total - 1} onClick={() => onMove(1)} className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-800 disabled:opacity-30">
              <ChevronDownIcon width={16} height={16} />
            </button>
          </div>
          <div className="w-full min-w-0 sm:w-72">
            <BannerPreview
              eyebrow={banner.eyebrow ?? ""}
              title={banner.title}
              subtitle={banner.subtitle ?? ""}
              buttonText={banner.button_text}
              imageSrc={imageUrl(banner.image_path)}
              theme={banner.theme}
              showButton={banner.action_type !== "none"}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-semibold leading-snug">{banner.title}</h2>
              {banner.subtitle && <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{banner.subtitle}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <button aria-label={`Edit ${banner.title}`} title="Edit" disabled={locked} onClick={onEdit} className={iconBtn}>
                <PencilIcon width={16} height={16} />
              </button>
              <button aria-label={`Delete ${banner.title}`} title="Delete" disabled={locked} onClick={onDelete} className={`${iconBtn} text-red-600 hover:bg-red-50 hover:text-red-700`}>
                <TrashIcon width={16} height={16} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              role="switch"
              aria-checked={banner.is_active}
              aria-label={banner.is_active ? "Deactivate banner" : "Activate banner"}
              disabled={locked || cannotActivate}
              title={cannotActivate ? "4 banners are already active. Deactivate one first." : undefined}
              onClick={onToggle}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${banner.is_active ? "bg-primary-500" : "bg-ink-300"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${banner.is_active ? "left-[22px]" : "left-0.5"}`} />
            </button>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          {cannotActivate && <p className="mt-2 text-xs text-amber-700">4 banners are already active. Deactivate one first.</p>}

          <dl className="mt-auto space-y-1.5 pt-4 text-xs text-ink-500">
            <div className="flex items-center gap-2">
              <CalendarIcon width={14} height={14} className="shrink-0" />
              <dd>{dates}</dd>
            </div>
            <div className="flex items-start gap-2">
              <CursorIcon width={14} height={14} className="mt-0.5 shrink-0" />
              <dd className="min-w-0 break-words">
                “{banner.button_text}” → {ACTION_LABELS[banner.action_type]}
                {banner.action_type === "link" && banner.link_url && <span className="block truncate text-ink-400">{banner.link_url}</span>}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}
