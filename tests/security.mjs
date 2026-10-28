import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {Miniflare,convertV4MiniflareOptions}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const config=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
const root=path.resolve('dist/server');
const modules=['index.js',...(await readdir(root,{recursive:true})).filter(f=>/\.(m?js)$/.test(f)&&f!=='index.js')].map(f=>({type:'ESModule',path:path.join(root,f)}));
const uid={tourist:'11111111-1111-4111-8111-111111111111',other:'22222222-2222-4222-8222-222222222222',partner:'33333333-3333-4333-8333-333333333333',admin:'44444444-4444-4444-8444-444444444444'};
const factorId='55555555-5555-4555-8555-555555555555';
const uploadId='66666666-6666-4666-8666-666666666666';
const bookingId='77777777-7777-4777-8777-777777777777';
const reviewId='88888888-8888-4888-8888-888888888888';
const profiles=Object.entries(uid).map(([name,id])=>({id,email:name==='admin'?'nncdecdgc@gmail.com':name+'@example.invalid',role:name==='partner'?'partner':'tourist',payload:{id,name,email:name+'@example.invalid',role:'tourist',phone:'',homeAddress:'',language:'tr'}}));
const venue={id:'public-venue',ownerId:uid.partner,name:'Test venue',category:'restaurants',subcategory:'',status:'published',version:1,city:'İstanbul',district:'',address:'',description:{tr:'',en:'',ru:''},lat:41,lng:29,image:'',gallery:[],services:[],phone:'',website:'',open:'09:00',close:'22:00',price:10,currency:'TRY',bookingType:'table',capacity:4,alcohol:false,discount:0,isDemo:true};
// Use a real model category to preserve compatibility with the application's catalog.
const model=await readFile('lib/model.ts','utf8');
venue.category=model.match(/export const categories\s*=\s*\[\s*['"]([^'"]+)/)?.[1]||'restaurants';
const tables={cg_users:profiles,cg_meta:[{key:'seed_v1'}],cg_venues:[{id:venue.id,owner_id:uid.partner,status:'published',version:1,payload:venue},{id:'private-venue',owner_id:uid.other,status:'draft',version:1,payload:{...venue,id:'private-venue',ownerId:uid.other,status:'draft'}}],cg_bookings:[{id:bookingId,user_id:uid.other,venue_id:venue.id,status:'confirmed',payload:{id:bookingId,userId:uid.other,venueId:venue.id,status:'confirmed'}}],cg_favorites:[],cg_reviews:[{id:reviewId,user_id:uid.other,venue_id:venue.id,status:'published',version:1,payload:{id:reviewId,userId:uid.other,bookingId,venueId:venue.id,author:'Guest',text:'Test',rating:5}}],cg_feedback:[],cg_uploads:[{id:uploadId,user_id:uid.other,key:'photos/'+uploadId,content_type:'image/png'}]};
let providerCalls=0,revoked=false,failContext=false,denyLogin=false,failUnenroll=false,ip=0;
const factors={tourist:null,other:null,partner:null,admin:null};
const account=token=>token.replace(/-weak$/,'');
function identity(token){const base=token.replace(/-weak$/,'');return profiles.find(p=>p.id===uid[base])}
function matches(row,search){for(const [key,value]of search){
 if(['select','limit','order','on_conflict'].includes(key))continue;
 if(key==='or'){
  const terms=[...value.matchAll(/(\w+)\.eq\.([^,()]+)|(\w+)\.in\.\(([^)]+)\)/g)];
  if(!terms.some(m=>m[1]?String(row[m[1]])===m[2]:m[4].split(',').includes(String(row[m[3]]))))return false;
 }else if(value.startsWith('eq.')&&String(row[key])!==value.slice(3))return false;
 else if(value.startsWith('in.')&&!value.slice(4,-1).split(',').includes(String(row[key])))return false;
}return true}
const outbound=async req=>{
 const u=new URL(req.url);if(u.hostname!=='qfohfbuwnpjcbhmyosaf.supabase.co')return new Response('Unexpected upstream',{status:502});
 providerCalls++;
 const token=(req.headers.get('authorization')||'').replace('Bearer ','');const who=identity(token);
 if(u.pathname==='/auth/v1/user')return who?Response.json({id:who.id,email:who.email,email_confirmed_at:'2026-01-01',user_metadata:{role:'admin',name:'Verified user'},factors:factors[account(token)]?[{id:factorId,factor_type:'totp',status:factors[account(token)]}]:[]}):Response.json({error:'bad_token'},{status:401});
 if(u.pathname==='/rest/v1/rpc/cg_session_context')return failContext?new Response('',{status:503}):Response.json({active:!!who&&!revoked,requires_mfa:factors[account(token)]==='verified',aal:token.endsWith('-weak')||factors[account(token)]!=='verified'?'aal1':'aal2'});
 if(u.pathname==='/auth/v1/token'||u.pathname==='/auth/v1/signup'){
  if(denyLogin)return Response.json({error:'credentials'},{status:400});
  return Response.json({access_token:'tourist',refresh_token:'refresh-fixture',expires_in:3600,user:{email_confirmed_at:'2026-01-01'}});
 }
 if(u.pathname==='/auth/v1/logout'){if(u.searchParams.get('scope')!=='local')revoked=true;return new Response(null,{status:204})}
 if(u.pathname==='/auth/v1/factors'&&req.method==='POST'){factors[account(token)]='unverified';return Response.json({id:factorId,totp:{qr_code:'<svg/>',secret:'FIXTUREONLY'}})}
 if(u.pathname===`/auth/v1/factors/${factorId}/challenge`)return Response.json({id:'challenge-fixture'});
 if(u.pathname===`/auth/v1/factors/${factorId}/verify`){const d=await req.json();if(d.code!=='123456')return Response.json({error:'wrong_code'},{status:400});factors[account(token)]='verified';return Response.json({access_token:account(token),refresh_token:'new-refresh-fixture',expires_in:3600})}
 if(u.pathname===`/auth/v1/factors/${factorId}`&&req.method==='DELETE'){if(failUnenroll)return Response.json({error:'provider_failure'},{status:400});if(factors[account(token)]==='verified'&&token.endsWith('-weak'))return Response.json({error:'aal2_required'},{status:403});factors[account(token)]=null;return new Response(null,{status:204})}
 if(u.pathname.startsWith('/rest/v1/')){
  const name=u.pathname.split('/').at(-1),data=tables[name];if(!data)return Response.json({error:'unknown_table'},{status:400});
  if(req.method==='GET')return Response.json(data.filter(row=>matches(row,u.searchParams)));
  if(req.method==='PATCH'){const patch=await req.json(),rows=data.filter(row=>matches(row,u.searchParams));rows.forEach(row=>Object.assign(row,patch));return Response.json(rows)}
  if(req.method==='POST'){const rows=await req.json();data.push(...rows);return Response.json(rows)}
  if(req.method==='DELETE'){const rows=data.filter(row=>matches(row,u.searchParams));tables[name]=data.filter(row=>!rows.includes(row));return Response.json(rows)}
 }
 return new Response('Unexpected upstream',{status:500});
};
const mf=new Miniflare(convertV4MiniflareOptions({modules,modulesRoot:root,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,bindings:{...config.vars,SUPABASE_SECRET_KEY:'sb_secret_test_fixture'},ratelimits:Object.fromEntries(config.ratelimits.map(({name,...rest})=>[name,rest])),outboundService:outbound}));
const origin='https://city-guide-istanbul.nncdecdgc.workers.dev';
const cookie=who=>who?{'Cookie':'__Host-cg_access_token='+who}:{};
async function request(url,who,body,extra={}){
 const method=body===undefined?'GET':'POST';
 return mf.dispatchFetch(origin+url,{method,redirect:'manual',headers:{...cookie(who),'cf-connecting-ip':'192.0.'+Math.floor(++ip/250)+'.'+ip%250,...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'}),...extra.headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)}),...Object.fromEntries(Object.entries(extra).filter(([k])=>k!=='headers'))});
}
let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name)}
async function status(url,who,body,expected,extra){const r=await request(url,who,body,extra);assert.equal(r.status,expected,await r.clone().text());return r}
const action=(action,data,who='tourist')=>request('/api/action',who,{action,data});
try{
 await check('sign-in renders with fresh CSP nonce',async()=>{const a=await request('/signin'),b=await request('/signin');assert.equal(a.status,200);const csp=a.headers.get('content-security-policy');assert.match(csp,/nonce-/);assert.doesNotMatch(csp,/script-src[^;]*unsafe-inline/);assert.notEqual(csp,b.headers.get('content-security-policy'));const nonce=csp.match(/nonce-([^']+)/)[1],html=await a.text();for(const tag of html.matchAll(/<script\b[^>]*>/g))assert.ok(tag[0].includes(nonce));});
 for(const [name,value]of Object.entries({'x-frame-options':'DENY','x-content-type-options':'nosniff','referrer-policy':'no-referrer','cross-origin-resource-policy':'same-origin'}))await check('header '+name,async()=>assert.equal((await request('/signin')).headers.get(name),value));
 await check('errors are private and not cached',async()=>{const r=await request('/api/state');assert.equal(r.status,401);assert.match(r.headers.get('cache-control'),/no-store/)});
 for(const route of ['/api/action','/api/auth/session','/api/upload','/api/auth/mfa']){
  await check('reject missing Origin '+route,()=>status(route,'tourist',{},403,{headers:{Origin:''}}));
  await check('reject cross-origin '+route,()=>status(route,'tourist',{},403,{headers:{Origin:'https://attacker.invalid'}}));
  await check('reject same-site cross-origin metadata '+route,()=>status(route,'tourist',{},403,{headers:{'Sec-Fetch-Site':'same-site'}}));
 }
 await check('forged identity headers do not authenticate',()=>status('/api/state',undefined,undefined,401,{headers:{'oai-authenticated-user-email':'nncdecdgc@gmail.com','x-user-id':uid.admin}}));
 await check('invalid token fails closed',()=>status('/api/state','invalid',undefined,401));
 await check('revoked session fails closed',async()=>{revoked=true;await status('/api/state','tourist',undefined,401);revoked=false});
 await check('session verification outage fails closed',async()=>{failContext=true;await status('/api/state','tourist',undefined,401);failContext=false});
 for(const who of ['admin','partner'])await check('MFA off by default for '+who,()=>status('/api/state?surface='+who,who+'-weak',undefined,200));
 await check('admin page accepts password session before opt-in',()=>status('/admin','admin-weak',undefined,200));
 await check('settings show MFA disabled before opt-in',async()=>{const r=await status('/api/auth/mfa','admin-weak',undefined,200);assert.equal((await r.json()).enabled,false)});
 factors.admin='verified';factors.partner='verified';
 for(const who of ['admin-weak','partner-weak'])await check('opted-in MFA required '+who,()=>status('/api/state',who,undefined,403));
 await check('opted-in account redirects to MFA',async()=>{const r=await request('/admin','admin-weak');assert.equal(r.status,307);assert.match(r.headers.get('location'),/security/)});
 await check('tourist cannot access admin state',()=>status('/api/state?surface=admin','tourist',undefined,403));
 await check('tourist cannot access partner state',()=>status('/api/state?surface=partner','tourist',undefined,403));
 await check('tourist state isolates bookings and strips review identifiers',async()=>{const r=await status('/api/state?surface=tourist','tourist',undefined,200),d=await r.json();assert.equal(d.user.role,'tourist');assert.equal(d.bookings.length,0);assert.equal(d.users,undefined);assert.ok(!d.venues.some(v=>v.status==='draft'));if(d.reviews.length){assert.equal(d.reviews[0].bookingId,'');assert.equal(d.reviews[0].userId,'')}});
 await check('partner cannot read another profile directory',async()=>{const r=await status('/api/state?surface=partner','partner',undefined,200),d=await r.json();assert.equal(d.users,undefined);assert.ok(d.venues.every(v=>v.status==='published'||v.ownerId===uid.partner))});
 await check('verified admin can read admin state',()=>status('/api/state?surface=admin','admin',undefined,200));
 for(const act of ['userRole','venueStatus','feedbackStatus'])await check('tourist cannot execute '+act,async()=>assert.equal((await action(act,{})).status,403));
 await check('tourist cannot cancel another booking',async()=>assert.equal((await action('bookingStatus',{id:bookingId,status:'cancelled'})).status,403));
 await check('profile cannot change email or role',async()=>{const r=await action('profile',{name:'New name',phone:'',language:'tr',homeAddress:'',role:'admin',email:'nncdecdgc@gmail.com'});assert.equal(r.status,200);const d=await r.json();assert.equal(d.state.user.role,'tourist');assert.equal(d.state.user.email,'tourist@example.invalid')});
 await check('private media is denied',()=>status('/api/media/'+uploadId,'tourist',undefined,403));
 await check('invalid media UUID rejected',()=>status('/api/media/not-a-uuid','admin',undefined,404));
 await check('tourist upload denied',()=>status('/api/upload','tourist','',403,{headers:{'Content-Type':'multipart/form-data; boundary=x'}}));
 await check('malformed image denied',()=>status('/api/upload','partner','bad',400,{headers:{'Content-Type':'multipart/form-data; boundary=x'}}));
 await check('JSON content type required',()=>status('/api/auth/session',undefined,'{}',415,{headers:{'Content-Type':'text/plain'}}));
 for(const body of ['null','[]','{"action":"signin","email":{}}','{'])await check('malformed auth JSON '+body,()=>status('/api/auth/session',undefined,body,400));
 await check('oversized auth body rejected before provider',async()=>{const before=providerCalls;await status('/api/auth/session',undefined,'x'.repeat(17000),413);assert.equal(providerCalls,before)});
 await check('short signup password rejected',()=>status('/api/auth/session',undefined,{action:'signup',email:'a@example.invalid',password:'12345678'},400));
 await check('login cookies are host-bound, secure and HttpOnly',async()=>{const r=await status('/api/auth/session',undefined,{action:'signin',email:'a@example.invalid',password:'fixture-password',returnTo:'https://attacker.invalid'},200);const set=r.headers.getSetCookie().filter(x=>x.startsWith('__Host-'));assert.equal(set.length,2);for(const c of set){assert.match(c,/Secure/i);assert.match(c,/HttpOnly/i);assert.match(c,/SameSite=Lax/i);assert.match(c,/Path=\//i);assert.doesNotMatch(c,/Domain=/i)}assert.equal((await r.json()).next,'/tourist')});
 await check('OAuth uses PKCE and no-store',async()=>{const r=await request('/api/auth/google?return_to=https://attacker.invalid');assert.equal(r.status,307);assert.match(r.headers.get('location'),/code_challenge=/);assert.match(r.headers.get('location'),/code_challenge_method=s256/);assert.match(r.headers.get('cache-control'),/no-store/)});
 await check('OAuth invalid flow fails before token exchange',async()=>{const before=providerCalls,r=await request('/api/auth/google/callback?flow=wrong&code=fake');assert.match(r.headers.get('location'),/invalid_flow/);assert.equal(providerCalls,before)});
 await check('cross-site refresh denied',()=>status('/api/auth/refresh','tourist',undefined,403,{headers:{'Sec-Fetch-Site':'cross-site'}}));
 await check('MFA enroll reachable at AAL1',async()=>{const r=await status('/api/auth/mfa','tourist-weak',{action:'enroll'},200);assert.equal((await r.json()).id,factorId);assert.match(r.headers.get('cache-control'),/no-store/)});
 await check('MFA cannot verify another factor',()=>status('/api/auth/mfa','tourist-weak',{action:'verify',factorId:uploadId,code:'123456'},403));
 await check('MFA wrong code rejected',()=>status('/api/auth/mfa','tourist-weak',{action:'verify',factorId,code:'000000'},400));
 await check('MFA verification rotates secure session cookies',async()=>{const r=await status('/api/auth/mfa','tourist-weak',{action:'verify',factorId,code:'123456',returnTo:'/admin'},200);assert.equal((await r.json()).next,'/admin');assert.ok(r.headers.getSetCookie().some(c=>c.startsWith('__Host-cg_access_token=tourist')))});
 await check('MFA is enabled only after code verification',async()=>{const r=await status('/api/auth/mfa','tourist',undefined,200);assert.equal((await r.json()).enabled,true)});
 await check('password session cannot replace a verified factor',()=>status('/api/auth/mfa','partner-weak',{action:'enroll'},409));
 await check('disable requires a code',()=>status('/api/auth/mfa','admin',{action:'disable',factorId},400));
 await check('cannot disable another factor',()=>status('/api/auth/mfa','partner',{action:'disable',factorId:uploadId,code:'123456'},403));
 await check('wrong disable code preserves MFA',async()=>{await status('/api/auth/mfa','partner',{action:'disable',factorId,code:'000000'},400);assert.equal(factors.partner,'verified')});
 await check('disable verifies fresh code, unenrolls and clears cookies',async()=>{const r=await status('/api/auth/mfa','partner-weak',{action:'disable',factorId,code:'123456',returnTo:'/partner#settings'},200);assert.equal(factors.partner,null);assert.equal((await r.json()).next,'/signin?return_to=%2Fpartner%23settings');assert.match(r.headers.get('set-cookie'),/Max-Age=0/i)});
 await check('partner password session works after voluntary disable',()=>status('/api/state?surface=partner','partner-weak',undefined,200));
 await check('unenrollment failure preserves the enabled factor',async()=>{failUnenroll=true;await status('/api/auth/mfa','tourist',{action:'disable',factorId,code:'123456'},400);assert.equal(factors.tourist,'verified');failUnenroll=false});
 await check('voluntary disable can be retried safely',async()=>{await status('/api/auth/mfa','tourist',{action:'disable',factorId,code:'123456'},200);assert.equal(factors.tourist,null)});
 await check('unverified setup does not force MFA',async()=>{await status('/api/auth/mfa','other-weak',{action:'enroll'},200);const r=await status('/api/auth/mfa','other-weak',undefined,200);assert.equal((await r.json()).enabled,false);await status('/api/state','other-weak',undefined,200)});
 await check('account login throttle applies across IPs',async()=>{denyLogin=true;let r;for(let i=0;i<12;i++)r=await request('/api/auth/session',undefined,{action:'signin',email:'throttle@example.invalid',password:'fixture-password'});assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'60');denyLogin=false});
 await check('IP throttle returns 429',async()=>{let r;for(let i=0;i<35;i++)r=await request('/api/auth/google',undefined,undefined,{headers:{'cf-connecting-ip':'198.51.100.9'}});assert.equal(r.status,429)});
 await check('logout revokes provider and clears cookies',async()=>{const r=await status('/api/auth/session','tourist',{action:'signout'},200);assert.equal((await r.json()).revoked,true);assert.equal(revoked,true);assert.match(r.headers.get('set-cookie'),/Max-Age=0/i)});
 console.log(JSON.stringify({passed:checks,scope:'compiled Worker with isolated Supabase HTTP fixtures; no external requests'}));
}finally{await mf.dispose()}
