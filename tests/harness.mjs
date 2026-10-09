import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
export async function harness({migrations=true,outboundService}={}){
 const root=path.resolve('dist/server');
 const files=await readdir(root,{recursive:true});
 const modules=['index.js',...files.filter(f=>/\.(m?js)$/.test(f)&&f!=='index.js')].map(f=>({type:'ESModule',path:path.join(root,f)}));
 const mf=new Miniflare({modules,modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'city-guide-regression'},r2Buckets:{BUCKET:'city-guide-regression'},...(outboundService?{outboundService}:{})});
 const db=await mf.getD1Database('DB');
 const headers=who=>who?{'oai-authenticated-user-id':who,'oai-authenticated-user-email':['owner','legacy-owner'].includes(who)?'nncdecdgc@gmail.com':who==='coadmin'?'Sayitatas@Hotmail.com':who+'@example.test'}:{};
 async function migrate(file){for(const stmt of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(stmt.trim())await db.prepare(stmt).run()}
 if(migrations)for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await migrate(file);
 async function request(url,who='owner',body,extra={}){
  const response=await mf.dispatchFetch('http://local.test'+url,{method:body?'POST':'GET',headers:{...headers(who),...(body?{'Content-Type':'application/json','Origin':'http://local.test'}:{})},...(body?{body:JSON.stringify(body)}:{}),...extra});
  return {status:response.status,...await response.json()};
 }
 return {mf,db,headers,migrate,request,action:(action,data,who='owner',surface)=>request('/api/action',who,{action,data,...(surface?{surface}:{})})};
}
