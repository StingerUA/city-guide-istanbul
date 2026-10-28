import {NextResponse} from 'next/server';
import {supabaseConfig} from '@/lib/supabase/config';
import {AUTH_COOKIE,REFRESH_COOKIE,safeReturnPath} from '@/lib/supabase/auth';
import {OAUTH_VERIFIER_COOKIE,OAUTH_FLOW_COOKIE,OAUTH_NEXT_COOKIE} from '../route';

export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};

function clearFlow(response:NextResponse){
 for(const name of [OAUTH_VERIFIER_COOKIE,OAUTH_FLOW_COOKIE,OAUTH_NEXT_COOKIE]){
  response.cookies.set(name,'',{path:'/api/auth/google',maxAge:0,httpOnly:true,sameSite:'lax'});
 }
 return response;
}

export async function GET(req:Request){
 const url=new URL(req.url);
 const {cookies}=await import('next/headers');
 const jar=await cookies();
 const verifier=jar.get(OAUTH_VERIFIER_COOKIE)?.value;
 const state=jar.get(OAUTH_FLOW_COOKIE)?.value;
 const expectedNext=jar.get(OAUTH_NEXT_COOKIE)?.value;
 const next=safeReturnPath(expectedNext);
 const flow=url.searchParams.get('flow');
 const code=url.searchParams.get('code');
 const valid=!!verifier&&!!state&&!!flow&&state===flow&&
   /^[a-zA-Z0-9_-]{43,128}$/.test(verifier);
 const errorResponse=(reason:string)=>clearFlow(
   NextResponse.redirect(new URL('/signin?oauth_error='+reason+'&return_to='+encodeURIComponent(next), url.origin),{headers:noStore}));

 if(!valid)return errorResponse('invalid_flow');
 if(url.searchParams.has('error'))return errorResponse('denied');
 if(!code||code.length>2048)return errorResponse('invalid_flow');
 const cfg=supabaseConfig();
 if(!cfg)return errorResponse('unavailable');

 try{
  const result=await fetch(cfg.url+'/auth/v1/token?grant_type=pkce',{
   method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},
   body:JSON.stringify({auth_code:code,code_verifier:verifier}),
   cache:'no-store',signal:AbortSignal.timeout(12000)
  });
  if(!result.ok)return errorResponse('exchange_failed');
  const tokens=await result.json() as {
   access_token?:string;refresh_token?:string;expires_in?:number;
   user?:{id?:string;email?:string;email_confirmed_at?:string|null}
  };
  if(!tokens.access_token||!tokens.refresh_token||!tokens.user?.id||
    !tokens.user?.email||!tokens.user?.email_confirmed_at)return errorResponse('unverified');

  const response=clearFlow(NextResponse.redirect(new URL(next,url.origin),{headers:noStore}));
  const options={httpOnly:true,secure:true,
    sameSite:'lax' as const,path:'/'};
  response.cookies.set(AUTH_COOKIE,tokens.access_token,{
   ...options,maxAge:Math.min(Math.max(tokens.expires_in||3600,60),3600)
  });
  response.cookies.set(REFRESH_COOKIE,tokens.refresh_token,{...options,maxAge:60*60*24*30});
  return response;
 }catch{return errorResponse('exchange_failed')}
}
