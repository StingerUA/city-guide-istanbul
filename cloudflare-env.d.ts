interface CloudflareEnv {
  ASSETS?:Fetcher;
  APP_ORIGINS?:string;
  AUTH_RATE_LIMITER?:import('./lib/http-security').Limiter;
  AUTH_ACCOUNT_RATE_LIMITER?:import('./lib/http-security').Limiter;
  READ_RATE_LIMITER?:import('./lib/http-security').Limiter;
  WRITE_RATE_LIMITER?:import('./lib/http-security').Limiter;
  UPLOAD_RATE_LIMITER?:import('./lib/http-security').Limiter;
  USER_WRITE_RATE_LIMITER?:import('./lib/http-security').Limiter;
  MFA_RATE_LIMITER?:import('./lib/http-security').Limiter;
  SUPABASE_URL?:string;
  SUPABASE_PUBLISHABLE_KEY?:string;
  /** Secret Workers binding: never expose via NEXT_PUBLIC_* */
  SUPABASE_SECRET_KEY?:string;
}
declare namespace Cloudflare {
  interface Env extends CloudflareEnv {}
}
