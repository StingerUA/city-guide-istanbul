import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {supabaseConfig} from './config';

export const AUTH_COOKIE = 'cg_access_token';
export const REFRESH_COOKIE = 'cg_refresh_token';
export type SupabaseUser = {userId:string; email:string; displayName:string; fullName:string|null};

export function safeReturnPath(value:string|null|undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/tourist';
  try {
    const url = new URL(value,'https://app.local');
    return url.origin === 'https://app.local' && !url.pathname.startsWith('/api/auth/')
      && url.pathname !== '/signin' ? url.pathname + url.search + url.hash : '/tourist';
  } catch { return '/tourist'; }
}

export async function getSupabaseUser():Promise<SupabaseUser|null> {
  const cfg = supabaseConfig();
  if (!cfg) return null;
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    // Always ask the trusted Supabase Auth server to validate the access token.
    // Never accept a profile email or a client-supplied X-User header.
    const r = await fetch(cfg.url+'/auth/v1/user',{
      headers:{apikey:cfg.key,Authorization:'Bearer '+token},
      cache:'no-store',
      signal:AbortSignal.timeout(5000)
    });
    if (!r.ok) return null;
    const user=await r.json() as {
      id?:string;email?:string;email_confirmed_at?:string|null;
      user_metadata?:{full_name?:unknown;name?:unknown};
    };
    if (!user.id || !user.email || !user.email_confirmed_at) return null;
    const candidate=user.user_metadata?.full_name??user.user_metadata?.name;
    const fullName=typeof candidate==='string'?candidate.slice(0,150):null;
    return {userId:user.id,email:user.email,displayName:fullName||user.email,fullName};
  } catch {return null}
}

export async function requireSupabaseUser(returnTo:string):Promise<SupabaseUser> {
  const user=await getSupabaseUser();
  if(user)return user;
  const jar=await cookies();
  const safe=safeReturnPath(returnTo);
  if(jar.get(REFRESH_COOKIE)?.value) redirect('/api/auth/refresh?return_to='+encodeURIComponent(safe));
  redirect('/signin?return_to='+encodeURIComponent(safe));
}
