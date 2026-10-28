import app from 'vinext/server/app-router-entry';
import {AppError} from './lib/errors';
import {enforceLimit,sameOrigin,securityHeaders} from './lib/http-security';

export default {
 async fetch(request:Request,env:CloudflareEnv,ctx:ExecutionContext){
  const url=new URL(request.url);
  const nonce=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  let response:Response;
  try{
   const allowed=(env.APP_ORIGINS||'https://city-guide-istanbul.nncdecdgc.workers.dev').split(',');
   const local=['localhost','127.0.0.1'].includes(url.hostname);
   if(!allowed.includes(url.origin)&&!local)throw new AppError('invalid_host',421);
   // Never trust user-supplied proxy identity or revalidation headers.
   if(url.pathname.startsWith('/api/')){
    const mutation=!['GET','HEAD','OPTIONS'].includes(request.method);
    if(mutation)sameOrigin(request);
    if(url.pathname.startsWith('/api/auth/refresh')&&request.headers.get('sec-fetch-site')==='cross-site')
      throw new AppError('forbidden',403);
    const ip=request.headers.get('cf-connecting-ip')||'unknown';
    const kind=url.pathname.startsWith('/api/auth/')?'auth':url.pathname==='/api/upload'?'upload':mutation?'write':'read';
    const binding=kind==='auth'?env.AUTH_RATE_LIMITER:kind==='upload'?env.UPLOAD_RATE_LIMITER:
      kind==='write'?env.WRITE_RATE_LIMITER:env.READ_RATE_LIMITER;
    await enforceLimit(binding,kind+':'+ip);
   }
   const forwarded=new Headers(request.headers);
   forwarded.set('Content-Security-Policy',securityHeaders(nonce)['Content-Security-Policy']);
   forwarded.set('x-nonce',nonce);
   response=await app.fetch(new Request(request,{headers:forwarded}),env,ctx);
  }catch(e){
   const known=e instanceof AppError;
   // Never log tokens, request bodies, query strings, or raw upstream errors.
   if(!known)console.error(JSON.stringify({event:'request_failed',code:'internal_error'}));
   response=Response.json({error:known?e.code:'internal_error'},
     {status:known?e.status:500,headers:{'Cache-Control':'no-store'}});
  }
  const html=response.headers.get('content-type')?.includes('text/html');
  response=new Response(response.body,response);
  for(const [name,value]of Object.entries(securityHeaders(html?nonce:undefined)))response.headers.set(name,value);
  if(url.pathname.startsWith('/api/')||html||response.status>=300&&response.status<400)
    response.headers.set('Cache-Control','private, no-store');
  if(response.status===429)response.headers.set('Retry-After','60');
  response.headers.delete('X-Powered-By');
  // The framework receives the nonce before rendering and applies it to its own
  // scripts. Never blindly add a trusted nonce to arbitrary response script tags.
  return response;
 }
};
