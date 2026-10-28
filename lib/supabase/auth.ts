import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {supabaseConfig} from './config';

export const AUTH_COOKIE = '__Host-cg_access_token';
export const REFRESH_COOKIE = '__Host-cg_refresh_token';
export type SupabaseUser = {userId:string; email:string; displayName:string; fullName:string|null;aal:'aal1'|'aal2';requiresMfa:boolean;factors:{id:string;factor_type:string;status:string}[]};

export function safeReturnPath(value:string|null|undefined) {
  if (!value || value.length>512 || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20\x7f]/.test(value)) return '/tourist';
  try {
    const url = new URL(value,'https://app.local');
    return url.origin === 'https://app.local' && ['/tourist','/admin','/partner'].includes(url.pathname)
      ? url.pathname + url.search + url.hash : '/tourist';
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
      factors?:{id:string;factor_type:string;status:string}[];
    };
    if (!user.id || !user.email || !user.email_confirmed_at) return null;
    const context=await fetch(cfg.url+'/rest/v1/rpc/cg_session_context',{
      method:'POST',headers:{apikey:cfg.key,Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:'{}',cache:'no-store',signal:AbortSignal.timeout(5000)
    });
    if(!context.ok)return null;
    const session=await context.json() as {active?:boolean;aal?:string;requires_mfa?:boolean};
    if(session.active!==true||typeof session.requires_mfa!=='boolean')return null;
    const candidate=user.user_metadata?.full_name??user.user_metadata?.name;
    const fullName=typeof candidate==='string'?candidate.slice(0,150):null;
    return {userId:user.id,email:user.email,displayName:fullName||user.email,fullName,
      aal:session.aal==='aal2'?'aal2':'aal1',requiresMfa:session.requires_mfa,factors:user.factors||[]};
  } catch {return null}
}

export async function requireSupabaseUser(returnTo:string):Promise<SupabaseUser> {
  const user=await getSupabaseUser();
  if(user){
    if(user.requiresMfa&&user.aal!=='aal2')redirect('/security?return_to='+encodeURIComponent(safeReturnPath(returnTo)));
    return user;
  }
  const jar=await cookies();
  const safe=safeReturnPath(returnTo);
  if(jar.get(REFRESH_COOKIE)?.value) redirect('/api/auth/refresh?return_to='+encodeURIComponent(safe));
  redirect('/signin?return_to='+encodeURIComponent(safe));
}
