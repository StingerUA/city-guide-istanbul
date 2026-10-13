import {NextResponse} from 'next/server';
import {supabaseConfig} from '@/lib/supabase/config';
import {safeReturnPath} from '@/lib/supabase/auth';

export const dynamic='force-dynamic';
export const OAUTH_VERIFIER_COOKIE='cg_google_pkce_verifier';
export const OAUTH_FLOW_COOKIE='cg_google_oauth_flow';
export const OAUTH_NEXT_COOKIE='cg_google_oauth_next';

const noStore={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const flowOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',
  sameSite:'lax' as const,path:'/api/auth/google',maxAge:600};

function urlSafe(bytes:Uint8Array):string{
 return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}

export async function GET(req:Request){
 const cfg=supabaseConfig();
 if(!cfg)return NextResponse.redirect(new URL('/signin?oauth_error=unavailable',req.url),{headers:noStore});
 const url=new URL(req.url);
 const origin=url.origin;
 const returnTo=url.searchParams.get('return_to');
 const next=returnTo&&returnTo.length<=512?safeReturnPath(returnTo):'/tourist';
 const verifier=urlSafe(crypto.getRandomValues(new Uint8Array(32)));
 const state=urlSafe(crypto.getRandomValues(new Uint8Array(32)));
 const challenge=urlSafe(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
 const callback=new URL('/api/auth/google/callback',origin);
 callback.searchParams.set('flow',state);
 const provider=new URL(cfg.url+'/auth/v1/authorize');
 provider.searchParams.set('provider','google');
 provider.searchParams.set('redirect_to',callback.toString());
 provider.searchParams.set('code_challenge',challenge);
 provider.searchParams.set('code_challenge_method','s256');

 const response=NextResponse.redirect(provider,{headers:noStore});
 response.cookies.set(OAUTH_VERIFIER_COOKIE,verifier,flowOptions);
 response.cookies.set(OAUTH_FLOW_COOKIE,state,flowOptions);
 response.cookies.set(OAUTH_NEXT_COOKIE,next,flowOptions);
 return response;
}
