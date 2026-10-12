interface CloudflareEnv {
  SUPABASE_URL?:string;
  SUPABASE_PUBLISHABLE_KEY?:string;
  /** Secret Workers binding: never expose via NEXT_PUBLIC_* */
  SUPABASE_SECRET_KEY?:string;
}
declare module 'cloudflare:workers' {
  export const env:CloudflareEnv;
}
