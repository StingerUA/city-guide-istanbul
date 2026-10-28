import {AppError} from './errors';

/** Cookie-authenticated writes must originate from this exact origin. */
export function sameOrigin(req:Request){
  const site=req.headers.get('sec-fetch-site');
  if(req.headers.get('origin')!==new URL(req.url).origin ||
     (site && site!=='same-origin' && site!=='none')) throw new AppError('forbidden',403);
}

export async function boundedBody(req:Request,limit:number,error='invalid_input'){
  const declared=req.headers.get('content-length');
  if(declared && (!/^\d+$/.test(declared)||Number(declared)>limit))throw new AppError(error,413);
  const reader=req.body?.getReader();if(!reader)return new Uint8Array(0);
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;
    if(size>limit){await reader.cancel();throw new AppError(error,413)}chunks.push(item.value);
  }}finally{reader.releaseLock()}
  const result=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength}return result;
}

export async function jsonBody(req:Request,limit=16384):Promise<unknown>{
  if(req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
    throw new AppError('unsupported_media_type',415);
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBody(req,limit)))}
  catch(e){if(e instanceof AppError)throw e;throw new AppError('invalid_input',400)}
}

export type Limiter={limit(options:{key:string}):Promise<{success:boolean}>};
export async function enforceLimit(limiter:Limiter|undefined,key:string){
  if(!limiter)throw new AppError('security_unavailable',503);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
  const hashed=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  let result:{success:boolean};
  try{result=await limiter.limit({key:hashed})}catch{throw new AppError('security_unavailable',503)}
  if(!result.success)throw new AppError('rate_limited',429);
}

export function securityHeaders(nonce?:string){
  return {
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY',
    'Referrer-Policy':'no-referrer',
    'Strict-Transport-Security':'max-age=31536000',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=(self), payment=(), usb=()',
    'Cross-Origin-Opener-Policy':'same-origin',
    'Cross-Origin-Resource-Policy':'same-origin',
    'Content-Security-Policy':[
      "default-src 'self'",`script-src 'self'${nonce?" 'nonce-"+nonce+"'":''}`,
      "script-src-attr 'none'","style-src 'self' 'unsafe-inline'",
      "img-src 'self' https: data: blob:","font-src 'self' data:","connect-src 'self'",
      'frame-src https://www.openstreetmap.org',"object-src 'none'","base-uri 'none'",
      "form-action 'self'","frame-ancestors 'none'","worker-src 'self'",'upgrade-insecure-requests'
    ].join('; ')
  };
}
