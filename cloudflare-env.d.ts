declare namespace Cloudflare {
  interface Env {
    DB?: D1Database; // Legacy: removed after PostgreSQL cutover.
    BUCKET?: R2Bucket; // Legacy: removed after Storage cutover.
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
  }
}
