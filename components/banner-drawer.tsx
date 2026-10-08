"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { CloseIcon, ImageIcon } from "@/components/icons";
import { BannerPreview, PHONE_SIZES, type PhoneSize } from "@/components/banner-preview";
import {
  ACTION_LABELS,
  MAX_ACTIVE_BANNERS,
  THEMES,
  hasTransparency,
  createBanner,
  friendlyError,
  imageUrl,
  normalizeUrl,
  removeImage,
  updateBanner,
  uploadImage,
  validateImage,
  type ActionType,
  type Banner,
  type BannerInput,
  type Category,
  type Theme,
} from "@/lib/banners";

interface Props {
  banner: Banner | null;
  categories: Category[];
  activeCountExcludingSelf: number;
  defaultOrder: number;
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
}

const field =
  "mt-1.5 w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-ink-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 disabled:bg-ink-50";

export function BannerDrawer({ banner, categories, activeCountExcludingSelf, defaultOrder, onClose, onSaved }: Props) {
  const editing = banner !== null;
  const slotFull = activeCountExcludingSelf >= MAX_ACTIVE_BANNERS;

  const [title, setTitle] = useState(banner?.title ?? "");
  const [eyebrow, setEyebrow] = useState(banner?.eyebrow ?? "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? "");
  const [buttonText, setButtonText] = useState(banner?.button_text ?? "");
  const [action, setAction] = useState<ActionType>(banner?.action_type ?? "explore");
  const [categoryId, setCategoryId] = useState(banner?.category_id ?? "");
  const [theme, setTheme] = useState<Theme>(banner?.theme ?? "green");
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState(banner?.link_url ?? "");
  const [order, setOrder] = useState(String(banner?.display_order ?? defaultOrder));
  const [start, setStart] = useState(banner?.start_date ?? "");
  const [end, setEnd] = useState(banner?.end_date ?? "");
  const [active, setActive] = useState(slotFull ? false : (banner?.is_active ?? true));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState<PhoneSize>("large");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- blob URL must be created/revoked with the effect
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function onPick(picked: File | undefined) {
    if (!picked) return;
    const problem = await validateImage(picked);
    setImageError(problem);
    setImageWarning(null);
    if (!problem) {
      setFile(picked);
      if (!(await hasTransparency(picked)))
        setImageWarning("This image has no transparent background, so it will show as a solid rectangle on the card.");
    } else if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  function validate(): string | null {
    if (!title.trim()) return "Title is required.";
    if (!buttonText.trim()) return "Button text is required.";
    if (!editing && !file) return "Please upload a banner image.";
    if (action === "category" && !categoryId) return "Select a category for this button.";
    if (action === "link" && !normalizeUrl(linkUrl)) return "Enter a valid link, e.g. https://example.com";
    const n = Number(order);
    if (!Number.isInteger(n) || n < 0 || n > 9999) return "Display order must be a whole number from 0 to 9999.";
    if (start && end && end < start) return "End date can't be before the start date.";
    if (active && slotFull) return `Only ${MAX_ACTIVE_BANNERS} banners can be active at a time.`;
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);

    const input: BannerInput = {
      title: title.trim(),
      eyebrow: eyebrow.trim() || null,
      subtitle: subtitle.trim() || null,
      button_text: buttonText.trim(),
      action_type: action,
      category_id: action === "category" ? categoryId : null,
      theme,
      link_url: action === "link" ? normalizeUrl(linkUrl) : null,
      display_order: Number(order),
      is_active: active,
      start_date: start || null,
      end_date: end || null,
    };

    let uploaded: string | null = null;
    try {
      if (file) uploaded = await uploadImage(file);
      if (banner) {
        await updateBanner(banner.id, uploaded ? { ...input, image_path: uploaded } : input);
        if (uploaded) await removeImage(banner.image_path);
      } else {
        await createBanner(input, uploaded!);
      }
      await onSaved(editing ? "Banner updated." : "Banner published.");
    } catch (err) {
      // Don't leave an orphaned upload behind when the row couldn't be saved.
      if (uploaded) await removeImage(uploaded);
      setError(friendlyError(err));
      setSaving(false);
    }
  }

  const shownImage = preview ?? (banner ? imageUrl(banner.image_path) : null);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-ink-900/40 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <form
        onSubmit={onSubmit}
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
        aria-label={editing ? "Edit banner" : "Add new banner"}
      >
        <header className="flex items-center justify-between border-b border-ink-200 px-6 py-4">
          <h2 className="text-lg font-bold">{editing ? "Edit banner" : "Add new banner"}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Preview: outside the scrolling area, so it stays visible while the form scrolls */}
        <section className="border-b border-ink-200 bg-white px-6 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Preview in the app</h3>
              <div className="flex rounded-lg bg-ink-100 p-0.5 text-xs font-medium" role="radiogroup" aria-label="Phone size">
                {(Object.keys(PHONE_SIZES) as PhoneSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={phone === size}
                    onClick={() => setPhone(size)}
                    className={`rounded-md px-2.5 py-1 capitalize transition ${phone === size ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 rounded-2xl bg-ink-100 p-2.5">
              <BannerPreview
                eyebrow={eyebrow}
                title={title}
                subtitle={subtitle}
                buttonText={buttonText}
                imageSrc={shownImage}
                theme={theme}
                showButton={action !== "none"}
                phone={phone}
              />
            </div>
          </section>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
          {/* Content */}
          <section>
            <SectionTitle>Content</SectionTitle>
            <Field label="Label" hint="small text above the title" htmlFor="b-eyebrow" counter={[eyebrow, 40]}>
              <input id="b-eyebrow" className={field} placeholder="e.g. BUY • SELL • REUSE" maxLength={40} value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} />
            </Field>
            <Field label="Title" required htmlFor="b-title" counter={[title, 100]}>
              <input id="b-title" className={field} placeholder="Enter banner title" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Subtitle" htmlFor="b-sub" counter={[subtitle, 200]}>
              <input id="b-sub" className={field} placeholder="Enter banner subtitle" maxLength={200} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </Field>
          </section>

          {/* Look */}
          <section>
            <SectionTitle>Look</SectionTitle>
            <div className="text-sm font-medium">
              Image {!editing && <span className="text-red-600">*</span>}
            </div>
            <div className="mt-1.5 flex items-center gap-4 rounded-xl border-2 border-dashed border-ink-300 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-400">
                {shownImage ? <ImageIcon className="text-primary-600" width={26} height={26} /> : <ImageIcon width={26} height={26} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{file ? file.name : shownImage ? "Current image" : "No image yet"}</p>
                <p className="mt-0.5 text-xs text-ink-500">Transparent PNG or WebP, about 600 × 600 · max 2 MB. Shown on the right of the card.</p>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/webp"
                hidden
                onChange={(e) => void onPick(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="shrink-0 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100"
              >
                {shownImage ? "Replace" : "Choose image"}
              </button>
            </div>
            {imageError && <p role="alert" className="mt-2 text-xs text-red-600">{imageError}</p>}
            {imageWarning && <p className="mt-2 text-xs text-amber-700">{imageWarning}</p>}

            <div className="mt-4 text-sm font-medium">Card color</div>
            <div className="mt-1.5 flex gap-3" role="radiogroup" aria-label="Card color">
              {(Object.keys(THEMES) as Theme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  aria-label={THEMES[t].label}
                  title={THEMES[t].label}
                  onClick={() => setTheme(t)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${theme === t ? "border-primary-600 ring-4 ring-primary-100" : "border-ink-200 hover:border-ink-300"}`}
                  style={{ backgroundColor: THEMES[t].bg }}
                >
                  <span className="block h-3.5 w-3.5 rounded-full" style={{ backgroundColor: THEMES[t].cta }} />
                </button>
              ))}
            </div>
          </section>

          {/* Button */}
          <section>
            <SectionTitle>Button</SectionTitle>
            <Field label="Button text" required htmlFor="b-btn" counter={[buttonText, 50]}>
              <input id="b-btn" className={field} placeholder="e.g. Explore Now" maxLength={50} value={buttonText} onChange={(e) => setButtonText(e.target.value)} />
            </Field>
            <Field label="When tapped" required htmlFor="b-action">
              <select id="b-action" className={field} value={action} onChange={(e) => setAction(e.target.value as ActionType)}>
                {(Object.keys(ACTION_LABELS) as ActionType[]).map((a) => (
                  <option key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </option>
                ))}
              </select>
            </Field>
            {action === "category" && (
              <Field label="Category" required htmlFor="b-cat">
                <select id="b-cat" className={field} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Choose a category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {action === "link" && (
              <Field label="Link" required htmlFor="b-link" hint="opens in the phone's browser">
                <input id="b-link" type="url" inputMode="url" className={field} placeholder="https://example.com/offer" maxLength={500} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              </Field>
            )}
          </section>

          {/* Schedule */}
          <section>
            <SectionTitle>Schedule</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date" htmlFor="b-start">
                <input id="b-start" type="date" className={field} value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="End date" htmlFor="b-end">
                <input id="b-end" type="date" min={start || undefined} className={field} value={end} onChange={(e) => setEnd(e.target.value)} />
              </Field>
            </div>
            <p className="-mt-1 text-xs text-ink-500">Optional. Leave empty to show it right away with no expiry (India time).</p>

            <Field label="Display order" required htmlFor="b-order" hint="lower numbers show first">
              <input id="b-order" type="number" min={0} max={9999} step={1} className={field} value={order} onChange={(e) => setOrder(e.target.value)} />
            </Field>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
              <div>
                <div className="text-sm font-medium">{active ? "Active" : "Inactive"}</div>
                <div className="text-xs text-ink-500">
                  {slotFull && !active ? "4 banners are already active, so this one saves as inactive." : "Only active banners show in the app."}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                aria-label="Active"
                disabled={slotFull && !active}
                onClick={() => setActive((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${active ? "bg-primary-500" : "bg-ink-300"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${active ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          </section>
        </div>

        <footer className="border-t border-ink-200 bg-white px-6 py-4">
          {error && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-ink-300 py-2.5 text-sm font-medium hover:bg-ink-50 disabled:opacity-60">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60">
              {saving ? "Saving…" : editing ? "Save changes" : "Publish banner"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">{children}</h3>;
}

function Field({
  label,
  hint,
  required,
  htmlFor,
  counter,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  htmlFor: string;
  counter?: [string, number];
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <label className="block text-sm font-medium" htmlFor={htmlFor}>
        {label} {required && <span className="text-red-600">*</span>}
        {hint && <span className="ml-1 font-normal text-ink-400">({hint})</span>}
      </label>
      {children}
      {counter && <p className="mt-1 text-right text-xs text-ink-400">{counter[0].length}/{counter[1]}</p>}
    </div>
  );
}
