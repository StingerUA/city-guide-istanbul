import {actor,AppError,db,handleError} from '@/lib/server';

type Forecast={temperature:number;symbol:string;time:string;updated:string;expires:number;source:string};
export async function GET(req:Request){
 try{
  await actor();
  const query=new URL(req.url).searchParams;
  const lat=Number(query.get('lat')),lon=Number(query.get('lon'));
  if(!query.has('lat')||!query.has('lon')||!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat > 90||lon < -180||lon > 180)throw new AppError('invalid_input');
  // Two decimal places provide city forecasts without sending a visitor's precise location.
  const coords=`lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`,key='weather:'+coords;
  const sql=db(),cached=await sql.prepare('SELECT value FROM cg_meta WHERE key=?').bind(key).first<{value:string}>();
  if(cached){const value=JSON.parse(cached.value) as Forecast;if(value.expires>Date.now())return Response.json(value,{headers:{'Cache-Control':'private, max-age=300'}})}
  const response=await fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?'+coords,{
   headers:{'User-Agent':'CityGuide/0.2 (https://city-guide-istanbul.nick-nesterenko.chatgpt.site)'},signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw new AppError('forecast_unavailable',503);
  const data=await response.json() as {properties:{meta:{updated_at:string};timeseries:{time:string;data:{instant:{details:{air_temperature:number}};next_1_hours?:{summary:{symbol_code:string}};next_6_hours?:{summary:{symbol_code:string}}}}[]}};
  const item=data.properties?.timeseries?.find(x=>Date.parse(x.time)>=Date.now()-3600000);
  if(!item||!Number.isFinite(item.data.instant.details.air_temperature))throw new AppError('forecast_unavailable',503);
  const upstreamExpiry=Date.parse(response.headers.get('expires')||'');
  const value:Forecast={temperature:item.data.instant.details.air_temperature,symbol:item.data.next_1_hours?.summary.symbol_code||item.data.next_6_hours?.summary.symbol_code||'',time:item.time,updated:data.properties.meta.updated_at,
   expires:Number.isFinite(upstreamExpiry)?Math.min(upstreamExpiry,Date.now()+6*3600000):Date.now()+3600000,source:'MET Norway'};
  await sql.prepare('INSERT INTO cg_meta (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(value)).run();
  return Response.json(value,{headers:{'Cache-Control':'private, max-age=300'}});
 }catch(e){if(e instanceof AppError)return handleError(e);return Response.json({error:'forecast_unavailable'},{status:503})}
}
