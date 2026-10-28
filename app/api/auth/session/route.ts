import {z} from 'zod';
import {env} from 'cloudflare:workers';
import {supabaseConfig} from '@/lib/supabase/config';
import {clearSession,storeSession} from '@/lib/supabase/sessions';
import {AUTH_COOKIE,safeReturnPath} from '@/lib/supabase/auth';
import {cookies} from 'next/headers';
import {jsonBody,sameOrigin,enforceLimit} from '@/lib/http-security';
import {AppError} from '@/lib/errors';
const noStore={'Cache-Control':'no-store'};
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('signout')}),
 z.object({action:z.enum(['signin','signup']),email:z.string().trim().email().max(254),password:z.string().min(8).max(128),returnTo:z.string().max(512).optional()})
]);
export async function POST(req:Request){try{
 sameOrigin(req);
 const input=schema.parse(await jsonBody(req));
 const cfg=supabaseConfig();
 if(!cfg)throw new AppError('supabase_not_configured',503);
 if(input.action==='signout'){
  const access=(await cookies()).get(AUTH_COOKIE)?.value;let revoked=!access;
  if(access)try{const r=await fetch(cfg.url+'/auth/v1/logout',{method:'POST',headers:{apikey:cfg.key,Authorization:'Bearer '+access},signal:AbortSignal.timeout(5000)});revoked=r.ok}catch{}
  await clearSession();return Response.json({next:'/signin',revoked},{headers:noStore});
 }
 const email=input.email.toLowerCase(),signup=input.action==='signup';
 if(signup&&input.password.length<15)throw new AppError('weak_password',400);
 await enforceLimit(env.AUTH_ACCOUNT_RATE_LIMITER,'login:'+email);
 const result=await fetch(cfg.url+(signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password'),{
  method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},body:JSON.stringify({email,password:input.password}),cache:'no-store',signal:AbortSignal.timeout(8000)
 });
 if(!result.ok)throw new AppError(signup?'signup_failed':'invalid_credentials',result.status===429?429:400);
 const tokens=await result.json() as {access_token?:string;refresh_token?:string;expires_in?:number;user?:{email_confirmed_at?:string|null}};
 if(signup&&!tokens.access_token)return Response.json({confirmationRequired:true},{headers:noStore});
 if(!tokens.user?.email_confirmed_at)throw new AppError('email_not_verified',403);
 await storeSession(tokens);return Response.json({next:safeReturnPath(input.returnTo)},{headers:noStore});
}catch(e){
 const error=e instanceof AppError?e:e instanceof z.ZodError?new AppError('invalid_input',400):new AppError('supabase_unavailable',503);
 return Response.json({error:error.code},{status:error.status,headers:noStore});
}}
