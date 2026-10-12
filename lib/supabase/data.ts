import {env} from 'cloudflare:workers';
import {supabaseConfig} from './config';

/**
 * Only used by server-side route handlers. Never export the elevated key to a
 * browser component or return it from a route. All authorization is performed
 * before calling this client, since the secret key bypasses RLS.
 */
export class DataError extends Error {
  constructor(public status:number,public code:string) {super(code)}
}
function credentials() {
  const cfg=supabaseConfig();
  const key=env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!cfg||!key||!key.startsWith('sb_secret_'))throw new DataError(503,'storage_unavailable');
  return {url:cfg.url,key};
}
export type Filter=Record<string,string>;
export async function dataRequest<T=unknown>(
  path:string,method='GET',query:Filter={},body?:unknown,prefer?:string,
  extraHeaders?:Record<string,string>
):Promise<T> {
  const {url,key}=credentials();
  const endpoint=new URL(url+path);
  for(const [k,v] of Object.entries(query))endpoint.searchParams.set(k,v);
  let r:Response;
  try {
    r=await fetch(endpoint,{
      method,headers:{
        apikey:key,
        ...(body!==undefined?{'Content-Type':'application/json'}:{}),
        ...(prefer?{Prefer:prefer}:{}),
        ...extraHeaders
      },
      ...(body!==undefined?{body:JSON.stringify(body)}:{}),
      cache:'no-store',
      signal:AbortSignal.timeout(15000)
    });
  }catch {throw new DataError(503,'storage_unavailable')}
  if(!r.ok){
    let error:{code?:string;message?:string}={};
    try{error=await r.json() as typeof error}catch{}
    if(error.code==='23505')throw new DataError(409,'conflict');
    throw new DataError(r.status===409?409:r.status===401?503:502,
      r.status===409?'conflict':'storage_unavailable');
  }
  const text=await r.text();
  return (text?JSON.parse(text):null) as T;
}
export function list<T>(table:string,filters:Filter={},select='*') {
  return dataRequest<T[]>('/rest/v1/'+table,'GET',{select,...filters});
}
export function insert<T>(table:string,body:unknown,filters:Filter={}) {
  return dataRequest<T[]>('/rest/v1/'+table,'POST',filters,body,'return=representation');
}
export function insertIgnore(table:string,body:unknown,conflict:string) {
  return dataRequest('/rest/v1/'+table,'POST',{on_conflict:conflict},body,
    'resolution=ignore-duplicates,return=minimal');
}
export function patch<T>(table:string,filters:Filter,body:unknown) {
  return dataRequest<T[]>('/rest/v1/'+table,'PATCH',filters,body,'return=representation');
}
export function remove<T>(table:string,filters:Filter) {
  return dataRequest<T[]>('/rest/v1/'+table,'DELETE',filters,undefined,'return=representation');
}
export async function storageRequest(path:string,method='GET',body?:Uint8Array,contentType?:string) {
  const {url,key}=credentials();
  try{
    const r=await fetch(url+'/storage/v1/object/'+path,{
      method,headers:{apikey:key,...(contentType?{'Content-Type':contentType}:{})},
      ...(body?{body}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)
    });
    if(!r.ok)throw new DataError(r.status===404?404:502,
      r.status===404?'not_found':'storage_unavailable');
    return r;
  }catch(e){if(e instanceof DataError)throw e;throw new DataError(503,'storage_unavailable')}
}
