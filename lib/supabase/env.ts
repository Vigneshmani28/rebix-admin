// Direct property access (not process.env[name]) so Next can inline these into the browser bundle.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
