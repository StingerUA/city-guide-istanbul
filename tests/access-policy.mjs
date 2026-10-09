/** Access-policy and hidden-category checks against an isolated Worker database. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {harness} from './harness.mjs';

const h=await harness();
const {mf,db,request,action,headers}=h;
let checks=0;
function check(value,message){assert.ok(value,message);checks++;console.log('PASS '+message)}
try{
 const first=await request('/api/state','outsider');
 check(first.user.role==='tourist','first visitor is never automatically made administrator');
 await db.prepare("INSERT INTO cg_meta(key,value) VALUES ('owner','outsider')").run();
 await db.prepare("UPDATE cg_users SET payload=json_set(payload,'$.role','admin') WHERE id='outsider'").run();
 check((await request('/api/state?surface=admin','outsider')).status===403,'legacy owner metadata and a stored admin role cannot grant access');
 check((await request('/api/state','outsider')).user.role==='tourist','non-allowlisted stored administrator resolves to tourist');
 const owner=await request('/api/state?surface=admin');
 check(owner.status===200&&owner.user.role==='admin','primary email has administrator access');
 const coadmin=await request('/api/state?surface=admin','coadmin');
 check(coadmin.status===200&&coadmin.user.role==='admin','second administrator email is matched case-insensitively');
 check(coadmin.users.filter(u=>u.role==='admin').length===2,'both administrators appear correctly in the user directory');
 check((await action('userRole',{id:'coadmin',role:'tourist',expectedRole:'tourist'})).status===409,'one administrator cannot demote the other through partner-role controls');
 check((await action('userRole',{id:'outsider',role:'admin',expectedRole:'tourist'})).status===400,'user-role API cannot add another administrator');
 const edited=await action('profile',{name:'Untrusted visitor',phone:'',language:'ru',homeAddress:'',email:'sayitatas@hotmail.com',role:'admin'},'outsider');
 check(edited.state.user.role==='tourist'&&edited.state.user.email==='outsider@example.test','profile fields cannot impersonate an administrator email');
 await action('userRole',{id:'outsider',role:'partner',expectedRole:'tourist'});
 check((await request('/api/state?surface=partner','outsider')).status===200,'explicit business assignment still enables the separate partner workspace');

 const hotel={...owner.venues[0],id:'hidden-hotel',name:'Hidden hotel',category:'hotel',bookingType:'stay',ownerId:'outsider',isDemo:false};
 await db.prepare('INSERT INTO cg_venues (id,owner_id,status,city,category,is_demo,version,payload,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(hotel.id,hotel.ownerId,hotel.status,hotel.city,hotel.category,0,hotel.version,JSON.stringify(hotel),hotel.updatedAt).run();
 for(const [surface,who] of [['admin','owner'],['partner','outsider'],['tourist','coadmin']]){
  const response=await request('/api/state?surface='+surface,who);
  check(response.status===200&&!response.venues.some(v=>v.category==='hotel'),'hotel listings stay hidden in '+surface+' state');
 }
 check((await action('saveVenue',{...hotel,id:undefined,version:0})).status===400,'new hotel listings are unavailable while the category is hidden');
 const date=new Date(Date.now()+14*86400000).toISOString().slice(0,10);
 const endDate=new Date(Date.now()+16*86400000).toISOString().slice(0,10);
 check((await action('book',{id:crypto.randomUUID(),venueId:hotel.id,name:'Guest',phone:'',date,endDate,time:'12:00',guests:1,payment:'onsite',note:''},'coadmin')).status===400,'direct requests cannot book a hidden hotel');
 check((await action('favorite',{id:hotel.id,value:true},'coadmin')).status===400,'direct requests cannot add a hidden hotel to favorites');
 check(!!await db.prepare('SELECT id FROM cg_venues WHERE id=?').bind(hotel.id).first(),'hiding hotels preserves existing records');

 for(const who of [null,'owner','coadmin','outsider']){
  const response=await mf.dispatchFetch('http://local.test/',{headers:headers(who),redirect:'manual'});
  check([302,303,307,308].includes(response.status)&&response.headers.get('location')==='/tourist','main URL always opens client home for '+(who||'anonymous visitor'));
 }
 for(const [area,who] of [['admin','owner'],['partner','outsider'],['tourist','coadmin']]){
  const response=await mf.dispatchFetch('http://local.test/'+area,{headers:headers(who)});
  const html=await response.text();
  check(response.status===200&&!html.includes('class="area-links"')&&!html.includes('Закрытый пилот')&&!html.includes('Начинаем без покупки домена'),'renders '+area+' without workspace switcher or launch notes');
 }
 for(const category of ['nightlife','history','nature']){
  const bytes=await readFile('public/images/category-'+category+'.webp');
  check(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP','packaged '+category+' image is a valid WebP asset');
 }
 console.log(JSON.stringify({passed:checks,scope:'isolated access policy, routing and hidden categories'}));
}finally{await mf.dispose()}
