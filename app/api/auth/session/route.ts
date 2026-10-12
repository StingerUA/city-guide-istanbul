import {supabaseConfig} from '@/lib/supabase/config';
import {clearSession,storeSession} from '@/lib/supabase/sessions';
import {AUTH_COOKIE,REFRESH_COOKIE,safeReturnPath} from '@/lib/supabase/auth';
import {cookies} from 'next/headers';

const noStore={'Cache-Control':'no-store'};
export async function POST(req:Request) {
  const origin=req.headers.get('origin');
  if(origin && origin!==new URL(req.url).origin)
    return Response.json({error:'forbidden'},{status:403,headers:noStore});
  const cfg=supabaseConfig();
  if(!cfg)return Response.json({error:'supabase_not_configured'},{status:503,headers:noStore});
  let input:{action?:string;email?:string;password?:string;returnTo?:string};
  try{input=await req.json()}catch{return Response.json({error:'invalid_input'},{status:400,headers:noStore})}
  const next=safeReturnPath(input.returnTo);
  if(input.action==='signout'){
    const access=(await cookies()).get(AUTH_COOKIE)?.value;
    // Session is cleared even if network revocation fails.
    if(access)try{await fetch(cfg.url+'/auth/v1/logout',{method:'POST',headers:{
      apikey:cfg.key,Authorization:'Bearer '+access},signal:AbortSignal.timeout(5000)})}catch{}
    await clearSession();
    return Response.json({next:'/signin'},{headers:noStore});
  }
  if(input.action==='signin'||input.action==='signup'){
    const email=(input.email||'').trim().toLowerCase(),password=input.password||'';
    if(email.length>254||!email.includes('@')||password.length<8||password.length>128)
      return Response.json({error:'invalid_credentials'},{status:400,headers:noStore});
    const signup=input.action==='signup';
    const endpoint=signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password';
    try{
      const response=await fetch(cfg.url+endpoint,{
        method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},
        body:JSON.stringify({email,password}),
        cache:'no-store',signal:AbortSignal.timeout(8000)
      });
      if(!response.ok)return Response.json({error:signup?'signup_failed':'invalid_credentials'},
        {status:response.status===429?429:400,headers:noStore});
      const tokens=await response.json() as {
        access_token?:string;refresh_token?:string;expires_in?:number;
        user?:{email_confirmed_at?:string|null}
      };
      if(signup && !tokens.access_token)
        return Response.json({confirmationRequired:true},{headers:noStore});
      if(!tokens.user?.email_confirmed_at)
        return Response.json({error:'email_not_verified'},{status:403,headers:noStore});
      await storeSession(tokens);
      return Response.json({next},{headers:noStore});
    }catch{return Response.json({error:'supabase_unavailable'},{status:503,headers:noStore})}
  }
  return Response.json({error:'invalid_input'},{status:400,headers:noStore});
}
