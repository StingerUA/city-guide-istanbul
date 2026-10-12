import {cookies} from 'next/headers';
import {AUTH_COOKIE,REFRESH_COOKIE} from './auth';

type TokenResponse = {access_token?:string;refresh_token?:string;expires_in?:number;user?:{email_confirmed_at?:string|null}};
export async function storeSession(token:TokenResponse) {
  if(!token.access_token||!token.refresh_token)throw new Error('bad_auth_response');
  const jar=await cookies();
  const common={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
  jar.set(AUTH_COOKIE,token.access_token,{...common,maxAge:Math.min(Math.max(token.expires_in||3600,60),3600)});
  jar.set(REFRESH_COOKIE,token.refresh_token,{...common,maxAge:60*60*24*30});
}
export async function clearSession() {
  const jar=await cookies();
  jar.delete(AUTH_COOKIE);
  jar.delete(REFRESH_COOKIE);
}
