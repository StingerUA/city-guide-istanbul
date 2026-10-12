import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {supabaseConfig} from '@/lib/supabase/config';
import {REFRESH_COOKIE,safeReturnPath} from '@/lib/supabase/auth';
import {storeSession,clearSession} from '@/lib/supabase/sessions';

export async function GET(req:Request){
  const origin=new URL(req.url).origin;
  const next=safeReturnPath(new URL(req.url).searchParams.get('return_to'));
  const cfg=supabaseConfig(),refresh=(await cookies()).get(REFRESH_COOKIE)?.value;
  if(cfg&&refresh){
    try{
      const result=await fetch(cfg.url+'/auth/v1/token?grant_type=refresh_token',{
        method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:refresh}),
        cache:'no-store',signal:AbortSignal.timeout(8000)
      });
      if(result.ok){
        const token=await result.json() as {
          access_token?:string;refresh_token?:string;expires_in?:number;
          user?:{email_confirmed_at?:string|null}
        };
        if(token.user?.email_confirmed_at&&token.access_token&&token.refresh_token){
          await storeSession(token);
          return NextResponse.redirect(new URL(next,origin),{headers:{'Cache-Control':'no-store'}});
        }
      }
    }catch{}
  }
  await clearSession();
  return NextResponse.redirect(new URL('/signin?return_to='+encodeURIComponent(next),origin),
    {headers:{'Cache-Control':'no-store'}});
}
