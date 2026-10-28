import {z} from 'zod';
import {cookies} from 'next/headers';
import {env} from 'cloudflare:workers';
import {getSupabaseUser,AUTH_COOKIE,safeReturnPath} from '@/lib/supabase/auth';
import {supabaseConfig} from '@/lib/supabase/config';
import {storeSession,clearSession} from '@/lib/supabase/sessions';
import {AppError} from '@/lib/errors';
import {jsonBody,sameOrigin,enforceLimit} from '@/lib/http-security';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
function failure(e:unknown){return Response.json({error:e instanceof AppError?e.code:'mfa_failed'},
 {status:e instanceof AppError?e.status:e instanceof z.ZodError?400:503,headers})}
async function authCall(path:string,body?:unknown,method='POST',accessToken?:string){
 const cfg=supabaseConfig(),token=accessToken||(await cookies()).get(AUTH_COOKIE)?.value;
 if(!cfg||!token)throw new AppError('signin_required',401);
 const r=await fetch(cfg.url+'/auth/v1'+path,{method,headers:{apikey:cfg.key,
   Authorization:'Bearer '+token,'Content-Type':'application/json'},
   ...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw new AppError(r.status===429?'rate_limited':'mfa_failed',r.status===429?429:400);
 return r.status===204?null:r.json();
}
export async function GET(){try{
 const u=await getSupabaseUser();if(!u)throw new AppError('signin_required',401);
 return Response.json({aal:u.aal,enabled:u.requiresMfa,required:u.requiresMfa,
   factors:u.factors.filter(f=>f.status==='verified'&&f.factor_type==='totp').map(f=>({id:f.id}))},{headers});
}catch(e){return failure(e)}}
export async function POST(req:Request){try{
 sameOrigin(req);
 const input=z.discriminatedUnion('action',[
   z.object({action:z.literal('enroll')}),
   z.object({action:z.enum(['verify','disable']),factorId:z.string().uuid(),code:z.string().regex(/^\d{6}$/),returnTo:z.string().max(512).optional()})
 ]).parse(await jsonBody(req,4096));
 const u=await getSupabaseUser();if(!u)throw new AppError('signin_required',401);
 await enforceLimit(env.MFA_RATE_LIMITER,u.userId);
 if(input.action==='enroll'){
   // Password-only sessions cannot replace a verified authenticator.
   if(u.factors.some(f=>f.status==='verified'))throw new AppError('mfa_already_enrolled',409);
   for(const factor of u.factors.filter(f=>f.factor_type==='totp'&&f.status==='unverified'))
     await authCall('/factors/'+factor.id,undefined,'DELETE');
   const f=await authCall('/factors',{factor_type:'totp',friendly_name:'City Guide',issuer:'City Guide'}) as {id:string;totp:{qr_code:string;secret:string}};
   return Response.json({id:f.id,qr:f.totp.qr_code,secret:f.totp.secret},{headers});
 }
 if(!u.factors.some(f=>f.id===input.factorId&&f.factor_type==='totp'))throw new AppError('forbidden',403);
 if(input.action==='disable'&&!u.factors.some(f=>f.id===input.factorId&&f.status==='verified'))
   throw new AppError('forbidden',403);
 const challenge=await authCall('/factors/'+input.factorId+'/challenge',{}) as {id:string};
 const tokens=await authCall('/factors/'+input.factorId+'/verify',{challenge_id:challenge.id,code:input.code}) as Parameters<typeof storeSession>[0];
 await storeSession(tokens);
 if(input.action==='disable'){
   // Require a fresh code, then use the newly verified AAL2 token to unenroll.
   await authCall('/factors/'+input.factorId,undefined,'DELETE',tokens.access_token);
   // End this session rather than leave an old AAL2 token in the browser.
   try{await authCall('/logout?scope=local',undefined,'POST',tokens.access_token)}catch{}
   await clearSession();
   console.info(JSON.stringify({event:'mfa_disabled',actorId:u.userId}));
   return Response.json({next:'/signin?return_to='+encodeURIComponent(safeReturnPath(input.returnTo))},{headers});
 }
 console.info(JSON.stringify({event:'mfa_verified',actorId:u.userId}));
 return Response.json({next:safeReturnPath(input.returnTo)},{headers});
}catch(e){return failure(e)}}
