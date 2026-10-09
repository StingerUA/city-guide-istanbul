/** Additional boundary, migration and retry checks. No production data or real upstream requests. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {harness} from './harness.mjs';
import {currency,demoVenues,istanbulDate,searchText,priceUnit} from '../lib/model.ts';
let passed=0,failed=0;
async function check(name,fn){try{await fn();passed++;console.log('PASS '+name)}catch(e){failed++;console.error('FAIL '+name+': '+e.message)}}
const expect=(value,message='unexpected result')=>assert.ok(value,message);
const calls=[];let upstreamMode='good';
const h=await harness({outboundService:async req=>{
 const url=new URL(req.url);calls.push({host:url.hostname,url:req.url,ua:req.headers.get('user-agent')});
 if(upstreamMode==='offline')return new Response('Unavailable',{status:503});
 if(url.hostname==='open.er-api.com')return Response.json(upstreamMode==='malformed'?{result:'success',rates:{USD:-1},time_last_update_utc:'not a date'}:{result:'success',base_code:'TRY',rates:{TRY:1,USD:.03,EUR:.025,RUB:2,GBP:.02,SAR:.11,IQD:40},time_last_update_utc:new Date().toUTCString()});
 if(url.hostname==='api.met.no')return Response.json({properties:{meta:{updated_at:new Date().toISOString()},timeseries:[{time:new Date().toISOString(),data:{instant:{details:{air_temperature:21.6}},next_1_hours:{summary:{symbol_code:'clearsky_day'}}}}]}},{headers:{Expires:new Date(Date.now()+3600000).toUTCString()}});
 return new Response('Unexpected external request',{status:500});
}});
const {mf,db,request,action,headers}=h;
try{
 const first=await request('/api/state');
 await request('/api/state','business');await action('userRole',{id:'business',role:'partner',expectedRole:'tourist'});
 await request('/api/state','traveler');
 const date=istanbulDate(new Date(Date.now()+14*86400000));
 const endDate=istanbulDate(new Date(Date.now()+17*86400000));
 const base={venueId:'demo-rent',name:'QA guest',phone:'',date,endDate,time:'12:00',guests:1,payment:'demo',note:''};
 const id=crypto.randomUUID();await action('book',{...base,id},'traveler');
 await check('changed details cannot reuse an earlier booking identifier',async()=>{const r=await action('book',{...base,id,name:'Different guest'},'traveler');expect(r.status===409&&r.error==='idempotency_conflict',JSON.stringify({status:r.status,error:r.error}))});
 await check('retrying an unchanged booking returns the original record',async()=>{const r=await action('book',{...base,id},'traveler');expect(r.status===200&&r.state.bookings.filter(b=>b.id===id).length===1)});
 await check('another user cannot reuse a booking identifier',async()=>expect((await action('book',{...base,id},'business')).status===403));
 await action('bookingStatus',{id,status:'cancelled'},'traveler');
 await check('retrying a cancelled request does not resurrect it',async()=>{const r=await action('book',{...base,id},'traveler');expect(r.status===200&&r.state.bookings.find(b=>b.id===id).status==='cancelled')});
 const same=crypto.randomUUID();
 await check('simultaneous retries create exactly one booking without server errors',async()=>{const result=await Promise.all([1,2,3].map(()=>action('book',{...base,id:same},'traveler')));expect(result.every(r=>r.status===200),'statuses '+result.map(r=>r.status));expect((await request('/api/state','traveler')).bookings.filter(b=>b.id===same).length===1)});
 await action('bookingStatus',{id:same,status:'cancelled'},'traveler');
 const template={...first.venues.find(v=>v.id==='demo-marmara'),id:undefined,version:0,name:'QA priced table',price:100.5,discount:10,capacity:2};
 const created=await action('saveVenue',template);let venue=created.state.venues.find(v=>v.id===created.result.id);
 const table={...base,venueId:venue.id,endDate:'',guests:2};
 await check('table price applies once and retains decimal accuracy after discount',async()=>{const key=crypto.randomUUID(),r=await action('book',{...table,id:key},'traveler');expect(r.status===200&&r.state.bookings.find(b=>b.id===key).total===90.45)});
 await check('party size cannot exceed the remaining table capacity',async()=>expect((await action('book',{...table,id:crypto.randomUUID()},'business')).status===409));
 await check('a decimal price is not displayed as a rounded whole amount',()=>expect(currency(90.45,'TRY','tr').includes('90,45'),currency(90.45,'TRY','tr')));
 await check('Turkish place searches match dotted I, dotless I and accents',()=>{for(const [name,query] of [['İSTİNYE PARK','istinye'],['Kadıköy','kadikoy'],['Beşiktaş','besiktas'],['Sarıyer','sariyer']])expect(searchText(name).includes(searchText(query)),name)});
 await check('price units match each booking calculation',()=>expect(priceUnit('table')==='perReservation'&&priceUnit('ticket')==='perPerson'&&priceUnit('rental')==='perDay'&&priceUnit('stay')==='perNight'&&priceUnit('appointment')==='perAppointment'));
 for(const [name,patch] of [['invalid calendar date',{date:'2027-02-30'}],['past date',{date:'2020-01-01'}],['time at closing',{time:venue.close}],['out of range party size',{guests:0}]])await check('rejects '+name,async()=>expect((await action('book',{...table,...patch,id:crypto.randomUUID()},'traveler')).status===400));
 for(const [name,patch] of [['backwards rental dates',{endDate:istanbulDate(new Date(Date.parse(date)-86400000))}],['rental longer than 90 days',{endDate:istanbulDate(new Date(Date.parse(date)+91*86400000))}]])await check('rejects '+name,async()=>expect((await action('book',{...base,...patch,id:crypto.randomUUID()},'traveler')).status===400));
 const overnight=await action('saveVenue',{...template,name:'QA overnight',capacity:10,open:'20:00',close:'02:00'});const nightId=overnight.result.id;
 for(const time of ['23:00','01:00'])await check('overnight venue accepts '+time,async()=>expect((await action('book',{...table,venueId:nightId,time,id:crypto.randomUUID()},'traveler')).status===200));
 for(const time of ['02:00','19:00'])await check('overnight venue rejects '+time,async()=>expect((await action('book',{...table,venueId:nightId,time,id:crypto.randomUUID()},'traveler')).status===400));
 await action('favorite',{id:venue.id,value:true},'traveler');
 await action('venueStatus',{id:venue.id,status:'archived',version:venue.version});
 await check('archived places cannot receive new bookings',async()=>expect((await action('book',{...table,id:crypto.randomUUID()},'traveler')).status===400));
 await check('tourist can remove an archived place from favorites',async()=>{const r=await action('favorite',{id:venue.id,value:false},'traveler');expect(r.status===200&&!r.state.favorites.includes(venue.id))});
 const form=new FormData();form.set('file',new File([await readFile('public/icon-192.png')],'private.png',{type:'image/png'}));
 const encoded=new Request('http://local.test/api/upload',{method:'POST',body:form});const bytes=await encoded.arrayBuffer(),contentType=encoded.headers.get('content-type');
 const upload=await mf.dispatchFetch('http://local.test/api/upload',{method:'POST',headers:{...headers('owner'),'content-type':contentType},body:bytes});const photo=(await upload.json()).url;
 await check('business cannot attach someone else’s private upload',async()=>expect((await action('saveVenue',{...template,name:'Forbidden photo',image:photo,gallery:[],status:'draft'},'business')).status===403));
 await check('service photos enforce the same ownership rule',async()=>expect((await action('saveVenue',{...template,name:'Forbidden service photo',image:'',gallery:[],services:[{id:'service',name:{ru:'Услуга',tr:'Hizmet',en:'Service'},price:0,duration:60,image:photo}],status:'draft'},'business')).status===403));
 await action('saveVenue',{...template,name:'Text mentioning private upload',description:{ru:photo,tr:'',en:''},image:'',gallery:[]});
 await check('a URL in public description text does not disclose a private upload',async()=>expect((await mf.dispatchFetch('http://local.test'+photo,{headers:headers('traveler')})).status===403));
 await check('path traversal is rejected for local image references',async()=>expect((await action('saveVenue',{...template,name:'Traversal image',image:'/images/../api/media/'+crypto.randomUUID()})).status===400));
 await check('a false image MIME signature is rejected',async()=>{const form=new FormData();const fake=new Uint8Array(64);fake.set([137,80,1,2,3]);form.set('file',new File([fake],'fake.png',{type:'image/png'}));const encoded=new Request('http://local.test/api/upload',{method:'POST',body:form});const r=await mf.dispatchFetch(encoded.url,{method:'POST',headers:{...headers('owner'),'content-type':encoded.headers.get('content-type')},body:await encoded.arrayBuffer()});expect(r.status===400)});
 await check('malformed multipart data returns a validation error',async()=>{const r=await mf.dispatchFetch('http://local.test/api/upload',{method:'POST',headers:{...headers('owner'),'content-type':'multipart/form-data; boundary=missing'},body:'not a multipart form'});expect(r.status===400)});
 await check('oversized image requests are bounded before multipart parsing',async()=>{const r=await mf.dispatchFetch('http://local.test/api/upload',{method:'POST',headers:{...headers('owner'),'content-type':'multipart/form-data; boundary=missing'},body:'x'.repeat(4500001)});expect(r.status===413)});
 for(const kind of ['gallery','services'])await check('published '+kind+' photos are visible and become private after archiving',async()=>{
  const result=await action('saveVenue',{...template,name:'Published '+kind,image:'',gallery:kind==='gallery'?[photo]:[],services:kind==='services'?[{id:'service',name:{ru:'Услуга',tr:'Hizmet',en:'Service'},price:0,duration:60,image:photo}]:[]});
  expect(result.status===200);const saved=result.state.venues.find(v=>v.id===result.result.id);
  expect((await mf.dispatchFetch('http://local.test'+photo,{headers:headers('traveler')})).status===200);
  await action('venueStatus',{id:saved.id,version:saved.version,status:'archived'});
  expect((await mf.dispatchFetch('http://local.test'+photo,{headers:headers('traveler')})).status===403);
 });
 await check('cross-origin mutations are rejected',async()=>expect((await request('/api/action','traveler',{action:'feedback',data:{kind:'help',rating:0,text:'cross-origin'}},{headers:{...headers('traveler'),'Content-Type':'application/json',Origin:'https://unrelated.example'}})).status===403));
 await check('oversized JSON is rejected even with no trusted content-length',async()=>{const r=await request('/api/action','traveler',{action:'feedback',data:{kind:'help',rating:0,text:'valid message'},padding:'x'.repeat(210000)});expect(r.status===413||r.status===400,'status '+r.status)});
 const profile={name:'QA business',phone:'',language:'tr',homeAddress:''};
 await check('profile saving cannot undo a concurrent successful role revocation',async()=>{
  for(let n=0;n<10;n++){
   const current=(await request('/api/state','business')).user.role;if(current==='tourist')await action('userRole',{id:'business',role:'partner',expectedRole:'tourist'});
   const [saved,revoked]=await Promise.all([action('profile',{...profile,name:profile.name+n},'business'),action('userRole',{id:'business',role:'tourist',expectedRole:'partner'})]);
   expect(saved.status===200);if(revoked.status===200)expect((await request('/api/state','business')).user.role==='tourist','revoked role was restored');
   else expect(revoked.status===409);
  }
 });
 await check('currency API rejects anonymous access before calling upstream',async()=>{const before=calls.length;const r=await request('/api/rates',null);expect(r.status===401&&calls.length===before,'status '+r.status)});
 await check('valid currency rates are cached after the first request',async()=>{await db.prepare("DELETE FROM cg_meta WHERE key='exchange_rates'").run();const before=calls.length;const a=await request('/api/rates','traveler'),b=await request('/api/rates','traveler');expect(a.status===200&&b.rates.USD===.03&&calls.length===before+1)});
 upstreamMode='malformed';await db.prepare("DELETE FROM cg_meta WHERE key='exchange_rates'").run();
 await check('malformed currency rates are not stored or shown',async()=>{const r=await request('/api/rates','traveler');expect(r.status===503&&!await db.prepare("SELECT value FROM cg_meta WHERE key='exchange_rates'").first())});
 upstreamMode='offline';await db.prepare("DELETE FROM cg_meta WHERE key='exchange_rates'").run();
 await check('upstream outage returns an honest unavailable response',async()=>expect((await request('/api/rates','traveler')).status===503));
 upstreamMode='good';
 await check('weather uses coarse city coordinates and identifiable server requests',async()=>{const before=calls.length;const r=await request('/api/weather?lat=41.01234&lon=28.97654','traveler');const sent=calls.at(-1);expect(r.status===200&&r.temperature===21.6&&calls.length===before+1&&sent.url.includes('lat=41.01&lon=28.98')&&sent.ua.includes('CityGuide'))});
 await check('weather reuses upstream cache expiry',async()=>{const before=calls.length;expect((await request('/api/weather?lat=41.01234&lon=28.97654','traveler')).status===200&&calls.length===before)});
 await check('simultaneous review submissions create one review without server errors',async()=>{const b=(await request('/api/state','traveler')).bookings.find(b=>b.venueId===nightId&&b.status==='pending');await action('bookingStatus',{id:b.id,status:'confirmed'});await action('bookingStatus',{id:b.id,status:'completed'});const result=await Promise.all([1,2,3].map(()=>action('review',{bookingId:b.id,rating:5,text:'Test public review'},'traveler')));expect(result.filter(r=>r.status===200).length===1&&result.filter(r=>r.status===400&&r.error==='already_reviewed').length===2);expect((await request('/api/state','traveler')).reviews.filter(r=>r.bookingId===b.id).length===1)});
 await check('a published business review hides identifiers from unrelated businesses',async()=>{const current=(await request('/api/state','business')).user.role;if(current==='tourist')await action('userRole',{id:'business',role:'partner',expectedRole:'tourist'});const r=(await request('/api/state?surface=partner','business')).reviews.find(r=>r.venueId===nightId);expect(r&&r.bookingId===''&&r.userId==='')});
}finally{await mf.dispose()}

// Existing v0.1 records are present before the v0.2 migration is applied.
const legacy=await harness({migrations:false});
try{
 await legacy.migrate('0000_steep_rachel_grey.sql');
 const now=new Date().toISOString(),v={...demoVenues[0],id:'legacy-place',ownerId:'legacy-owner',isDemo:false,version:7};
 await legacy.db.prepare("INSERT INTO cg_meta(key,value) VALUES ('owner','legacy-owner'),('seed_v1','done')").run();
 for(const [id,role]of [['legacy-owner','admin'],['legacy-business','partner']])await legacy.db.prepare('INSERT INTO cg_users(id,email,payload,created_at) VALUES (?,?,?,?)').bind(id,id+'@example.test',JSON.stringify({id,name:id,email:id+'@example.test',role,phone:'',homeAddress:'',language:'tr'}),now).run();
 await legacy.db.prepare('INSERT INTO cg_venues(id,owner_id,status,city,category,is_demo,version,payload,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(v.id,v.ownerId,v.status,v.city,v.category,0,7,JSON.stringify(v),now).run();
 const rid=crypto.randomUUID(),fid=crypto.randomUUID(),bid=crypto.randomUUID();
 await legacy.db.prepare('INSERT INTO cg_reviews(id,user_id,venue_id,booking_id,payload,created_at) VALUES (?,?,?,?,?,?)').bind(rid,'legacy-business',v.id,bid,JSON.stringify({id:rid,userId:'legacy-business',venueId:v.id,bookingId:bid,author:'Legacy business',rating:4,text:'Review before update',createdAt:now,isDemo:true}),now).run();
 await legacy.db.prepare('INSERT INTO cg_feedback(id,user_id,kind,payload,created_at) VALUES (?,?,?,?,?)').bind(fid,'legacy-business','help',JSON.stringify({kind:'help',rating:0,text:'Question before update'}),now).run();
 await legacy.migrate('0001_odd_layla_miller.sql');
 const state=await legacy.request('/api/state?surface=admin','legacy-owner');
 await check('schema upgrade preserves an allowlisted owner, business roles and listings',()=>expect(state.status===200&&state.user.role==='admin'&&state.users.find(u=>u.id==='legacy-business').role==='partner'&&state.venues.length===1&&state.venues[0].version===7));
 await check('schema upgrade preserves old review text with safe moderation defaults',()=>expect(state.reviews[0].text==='Review before update'&&state.reviews[0].status==='published'&&state.reviews[0].version===1));
 await check('schema upgrade preserves old support requests with safe triage defaults',()=>expect(state.feedback[0].text==='Question before update'&&state.feedback[0].status==='open'&&state.feedback[0].version===1));
 await check('upgraded old review can be moderated and old support request answered',async()=>expect((await legacy.action('moderateReview',{id:rid,version:1,status:'hidden'},'legacy-owner')).status===200&&(await legacy.action('feedbackStatus',{id:fid,version:1,status:'resolved',reply:'Migration retained this request'},'legacy-owner')).status===200));
}finally{await legacy.mf.dispose()}
console.log(JSON.stringify({passed,failed,scope:'isolated regression and migration tests; stubbed upstream feeds',browserQA:false}));
if(failed)process.exitCode=1;
