import { getSupabase } from "@/lib/supabase/client";
import { SUPABASE_URL } from "@/lib/supabase/env";

export const MAX_ACTIVE_BANNERS = 4;
export const BUCKET = "banners";
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** Transparent art only: PNG or WebP. */
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/webp"] as const;
export const MIN_SIZE = 200;

export type Theme = "green" | "orange" | "dark" | "blue";

/** Same colours as the mobile app's home-hero.tsx. */
export const THEMES: Record<Theme, { label: string; eyebrow: string; bg: string; circle: string; title: string; subtitle: string; cta: string; ctaText: string }> = {
  green: { label: "Green", eyebrow: "#06704F", bg: "#EAF6F0", circle: "#D0EBDD", title: "#111613", subtitle: "#47534D", cta: "#044D37", ctaText: "#FFFFFF" },
  orange: { label: "Orange", eyebrow: "#B45F18", bg: "#FFF4E6", circle: "#FDE3C4", title: "#111613", subtitle: "#47534D", cta: "#C4661B", ctaText: "#FFFFFF" },
  dark: { label: "Dark", eyebrow: "#A6D7BF", bg: "#044D37", circle: "#055F43", title: "#FFFFFF", subtitle: "#D0EBDD", cta: "#FFFFFF", ctaText: "#044D37" },
  blue: { label: "Blue", eyebrow: "#08678A", bg: "#E7F3F8", circle: "#CCE6F0", title: "#111613", subtitle: "#47534D", cta: "#08678A", ctaText: "#FFFFFF" },
};

export type ActionType = "explore" | "sell" | "category" | "link" | "none";

export const ACTION_LABELS: Record<ActionType, string> = {
  explore: "Open Explore",
  sell: "Open Post a Listing",
  category: "Open Category",
  link: "Open Link (in browser)",
  none: "No action (display only)",
};

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  image_path: string;
  button_text: string;
  action_type: ActionType;
  category_id: string | null;
  theme: Theme;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface BannerInput {
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  button_text: string;
  action_type: ActionType;
  category_id: string | null;
  theme: Theme;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}

export function imageUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Normalises what the admin typed into an http(s) URL, or null if it isn't one. */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : /^[a-z][a-z0-9+.-]*:/i.test(raw) ? "" : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return null;
    return url.toString().length <= 500 ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Turns Supabase/Postgres errors into something an admin can act on. */
export function friendlyError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  const lower = message.toLowerCase();
  if (lower.includes("only 4 banners")) return "Only 4 banners can be active at a time. Deactivate one first.";
  if (lower.includes("row-level security") || lower.includes("permission denied"))
    return "You don't have permission to do that. Make sure your account is in the admins table.";
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request failed"))
    return "Can't reach the server. Check your connection and try again.";
  if (lower.includes("jwt") || lower.includes("not authenticated"))
    return "Your session expired. Please sign in again.";
  if (lower.includes("mime") || lower.includes("not supported")) return "That image type isn't allowed. Use a PNG or WebP image.";
  if (lower.includes("exceeded") || lower.includes("too large") || lower.includes("payload"))
    return "That image is too large (max 2 MB).";
  return message || "Something went wrong. Please try again.";
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("is_admin");
  if (error) throw error;
  return data === true;
}

export async function listBanners(): Promise<Banner[]> {
  const { data, error } = await getSupabase()
    .from("banners")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Banner[];
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Reads the pixel size so we can reject images that would be cropped badly. */
export function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a readable image."));
    };
    img.src = url;
  });
}

/** Returns an error message, or null when the file is acceptable. */
export async function validateImage(file: File): Promise<string | null> {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return "Use a PNG or WebP image (transparent background).";
  if (file.size > MAX_IMAGE_BYTES) return "Image is too large. Keep it under 2 MB.";
  try {
    const { width, height } = await readImageSize(file);
    if (width < MIN_SIZE || height < MIN_SIZE) return `Image is too small (${width} × ${height}). Use at least ${MIN_SIZE}px on each side.`;
  } catch (e) {
    return e instanceof Error ? e.message : "That file isn't a readable image.";
  }
  return null;
}

/** True when the picture has see-through pixels (checked on a small copy). Used only for a warning. */
export async function hasTransparency(file: File): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;
    ctx.drawImage(bitmap, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
    return false;
  } catch {
    return true; // can't tell, so don't nag
  }
}

const EXT: Record<string, string> = { "image/png": "png", "image/webp": "webp" };

/** Unique file name per upload => URLs are immutable, so the app's image cache never shows a stale banner. */
export async function uploadImage(file: File): Promise<string> {
  const path = `${crypto.randomUUID()}.${EXT[file.type] ?? "png"}`;
  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return path;
}

/** Best effort: an orphaned file is harmless, so never fail the user's action over it. */
export async function removeImage(path: string): Promise<void> {
  try {
    await getSupabase().storage.from(BUCKET).remove([path]);
  } catch {
    /* ignore */
  }
}

export async function createBanner(input: BannerInput, imagePath: string): Promise<void> {
  const { error } = await getSupabase()
    .from("banners")
    .insert({ ...input, image_path: imagePath });
  if (error) throw error;
}

export async function updateBanner(id: string, patch: Partial<BannerInput> & { image_path?: string }): Promise<void> {
  const { data, error } = await getSupabase().from("banners").update(patch).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("That banner no longer exists. Refresh the page.");
}

export async function deleteBanner(banner: Banner): Promise<void> {
  const { error } = await getSupabase().from("banners").delete().eq("id", banner.id);
  if (error) throw error;
  await removeImage(banner.image_path);
}

/** Swaps display_order of two banners. */
export async function swapOrder(a: Banner, b: Banner): Promise<void> {
  const supabase = getSupabase();
  // If both share an order number, nudge so the swap is visible.
  const orderA = a.display_order === b.display_order ? b.display_order + 1 : b.display_order;
  const first = await supabase.from("banners").update({ display_order: orderA }).eq("id", a.id);
  if (first.error) throw first.error;
  const second = await supabase.from("banners").update({ display_order: a.display_order }).eq("id", b.id);
  if (second.error) throw second.error;
}

export type Status = "live" | "scheduled" | "expired" | "inactive";

/** Today in India (matches the database policy), as YYYY-MM-DD. */
export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export function bannerStatus(b: Banner): Status {
  if (!b.is_active) return "inactive";
  const today = todayIST();
  if (b.start_date && b.start_date > today) return "scheduled";
  if (b.end_date && b.end_date < today) return "expired";
  return "live";
}

export function formatDate(d: string | null): string {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
