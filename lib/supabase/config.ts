import { env } from 'cloudflare:workers';

/** Worker runtime variables; no Supabase secret/service-role key is used here. */
export function supabaseConfig() {
  const runtime=env as unknown as Record<string,string|undefined>;
  const url = runtime.SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = runtime.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !key.startsWith('sb_publishable_')) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) || parsed.pathname !== '/') return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}
