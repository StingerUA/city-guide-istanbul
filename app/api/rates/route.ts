import {actor,db,AppError,handleError} from '@/lib/server';

const currencies=['TRY','USD','EUR','RUB','GBP','SAR','IQD'];
type Rates={rates:Record<string,number>;updated:string;fetchedAt:number};
function valid(value:Rates){
 return value&&value.rates&&currencies.every(c=>Number.isFinite(value.rates[c])&&value.rates[c]>0)&&value.rates.TRY===1&&typeof value.updated==='string'&&Number.isFinite(Date.parse(value.updated));
}
async function latest():Promise<Rates>{
 try{
  const response=await fetch('https://open.er-api.com/v6/latest/TRY',{signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error();
  const p=await response.json() as {result:string;base_code:string;rates:Record<string,number>;time_last_update_utc:string};
  const value={rates:p.rates,updated:p.time_last_update_utc,fetchedAt:Date.now()};
  if(p.result!=='success'||p.base_code!=='TRY'||!valid(value))throw new Error();
  return {...value,rates:Object.fromEntries(currencies.map(c=>[c,p.rates[c]]))};
 }catch{throw new AppError('rates_unavailable',503)}
}
export async function GET(){
 try{
  await actor();const sql=db();
  const cache=await sql.prepare("SELECT value FROM cg_meta WHERE key='exchange_rates'").first<{value:string}>();
  if(cache){
   let value:Rates|undefined;try{value=JSON.parse(cache.value)}catch{/* Refresh an invalid cache. */}
   if(value&&valid(value)&&Number.isFinite(value.fetchedAt)&&Date.now()>=value.fetchedAt&&Date.now()-value.fetchedAt<6*3600000)return Response.json(value,{headers:{'Cache-Control':'no-store'}});
  }
  const value=await latest();
  await sql.prepare("INSERT INTO cg_meta (key,value) VALUES ('exchange_rates',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(value)).run();
  return Response.json(value,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return handleError(e)}
}
