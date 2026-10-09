import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {demoVenues,type Venue,type Profile,type AppState,type Surface,type Feedback,type Review} from './model';

export class AppError extends Error { constructor(public code:string,public status=400){super(code)} }
export function db(){if(!env.DB)throw new AppError('storage_unavailable',503);return env.DB}
export async function actor(){const u=await getChatGPTUser();if(!u)throw new AppError('signin_required',401);return u}
export async function profile():Promise<Profile>{
 const user=await actor(),sql=db();
 // Bootstrap is permitted only while Sites keeps this pilot owner-private.
 await sql.prepare("INSERT OR IGNORE INTO cg_meta (key,value) VALUES ('owner',?)").bind(user.userId).run();
 const owner=await sql.prepare("SELECT value FROM cg_meta WHERE key='owner'").first<{value:string}>();
 const initial:Profile={id:user.userId,name:user.fullName||'City Guide',email:user.email,phone:'',language:'ru',homeAddress:'',role:owner?.value===user.userId?'admin':'tourist'};
 await sql.prepare('INSERT OR IGNORE INTO cg_users (id,email,payload,created_at) VALUES (?,?,?,?)').bind(user.userId,user.email,JSON.stringify(initial),new Date().toISOString()).run();
 const row=await sql.prepare('SELECT payload FROM cg_users WHERE id=?').bind(user.userId).first<{payload:string}>();
 const saved:Profile=JSON.parse(row?.payload||JSON.stringify(initial));
 return {...saved,id:user.userId,email:user.email,role:owner?.value===user.userId?'admin':saved.role==='partner'?'partner':'tourist'};
}
export async function seed(){const sql=db();if(await sql.prepare("SELECT value FROM cg_meta WHERE key='seed_v1'").first())return;await sql.batch([...demoVenues.map(v=>sql.prepare('INSERT OR IGNORE INTO cg_venues (id,owner_id,status,city,category,is_demo,version,payload,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(v.id,v.ownerId,v.status,v.city,v.category,1,1,JSON.stringify(v),v.updatedAt)),sql.prepare("INSERT OR IGNORE INTO cg_meta (key,value) VALUES ('seed_v1','done')")])}
export async function venue(id:string){const row=await db().prepare('SELECT payload,version FROM cg_venues WHERE id=?').bind(id).first<{payload:string;version:number}>();if(!row)throw new AppError('not_found',404);return {...JSON.parse(row.payload),version:row.version} as Venue}
export function canEdit(u:Profile,v:Venue){return u.role==='admin'||(u.role==='partner'&&v.ownerId===u.id)}

export async function linkedMedia(url:string,ownerId?:string){
 // Only actual image fields authorize a photo; mentioning its URL in text does not.
 return !!await db().prepare(`SELECT v.id FROM cg_venues v
  WHERE (v.status='published' OR v.owner_id=?)
  AND (json_extract(v.payload,'$.image')=?
   OR EXISTS(SELECT 1 FROM json_each(v.payload,'$.gallery') g WHERE g.value=?)
   OR EXISTS(SELECT 1 FROM json_each(v.payload,'$.services') s WHERE json_extract(s.value,'$.image')=?))
  LIMIT 1`).bind(ownerId||'',url,url,url).first();
}
export async function checkVenueMedia(u:Profile,v:{image:string;gallery:string[];services:{image:string}[]}){
 const refs=[...new Set([v.image,...v.gallery,...v.services.map(s=>s.image)].filter(s=>s.startsWith('/api/media/')))];
 for(const url of refs){
  const row=await db().prepare('SELECT user_id FROM cg_uploads WHERE id=?').bind(url.slice('/api/media/'.length)).first<{user_id:string}>();
  if(!row)throw new AppError('invalid_image');
  if(u.role!=='admin'&&row.user_id!==u.id&&!await linkedMedia(url,u.role==='partner'?u.id:undefined))throw new AppError('forbidden',403);
 }
}
export async function boundedBody(req:Request,limit:number,error='invalid_input'){
 if(Number(req.headers.get('content-length')||0)>limit)throw new AppError(error,413);
 const reader=req.body?.getReader();if(!reader)return new Uint8Array(0);
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;
  if(size>limit){await reader.cancel();throw new AppError(error,413)}chunks.push(item.value);
 }}finally{reader.releaseLock()}
 const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength}return result;
}

export async function state(surface?:Surface):Promise<AppState>{
 const u=await profile();await seed();const sql=db();
 if(surface==='admin'&&u.role!=='admin')throw new AppError('forbidden',403);
 if(surface==='partner'&&u.role==='tourist')throw new AppError('forbidden',403);
 const tourist=surface==='tourist'||u.role==='tourist';
 const admin=u.role==='admin'&&!tourist&&surface!=='partner';
 const [v,b,f,r,tickets,people]=await Promise.all([
  tourist?sql.prepare("SELECT payload,version FROM cg_venues WHERE status='published' ORDER BY updated_at DESC").all<{payload:string;version:number}>():
   sql.prepare(admin?'SELECT payload,version FROM cg_venues ORDER BY updated_at DESC':"SELECT payload,version FROM cg_venues WHERE status='published' OR owner_id=? ORDER BY updated_at DESC").bind(...(admin?[]:[u.id])).all<{payload:string;version:number}>(),
  sql.prepare(admin?'SELECT payload FROM cg_bookings ORDER BY created_at DESC':tourist?'SELECT payload FROM cg_bookings WHERE user_id=? ORDER BY created_at DESC':'SELECT b.payload FROM cg_bookings b JOIN cg_venues v ON v.id=b.venue_id WHERE b.user_id=? OR v.owner_id=? ORDER BY b.created_at DESC').bind(...(admin?[]:tourist?[u.id]:[u.id,u.id])).all<{payload:string}>(),
  sql.prepare('SELECT venue_id FROM cg_favorites WHERE user_id=?').bind(u.id).all<{venue_id:string}>(),
  sql.prepare(admin?'SELECT payload,status,version FROM cg_reviews ORDER BY created_at DESC LIMIT 1000':tourist?"SELECT r.payload,r.status,r.version FROM cg_reviews r JOIN cg_venues v ON v.id=r.venue_id WHERE (v.status='published' AND r.status='published') OR r.user_id=? ORDER BY r.created_at DESC LIMIT 1000":"SELECT r.payload,r.status,r.version FROM cg_reviews r JOIN cg_venues v ON v.id=r.venue_id WHERE (v.status='published' AND r.status='published') OR v.owner_id=? OR r.user_id=? ORDER BY r.created_at DESC LIMIT 1000").bind(...(admin?[]:tourist?[u.id]:[u.id,u.id])).all<{payload:string;status:Review['status'];version:number}>(),
  sql.prepare('SELECT f.id,f.user_id,f.kind,f.payload,f.status,f.version,f.created_at,u.payload AS author_payload FROM cg_feedback f JOIN cg_users u ON u.id=f.user_id '+(admin?'':'WHERE f.user_id=? ')+'ORDER BY f.created_at DESC LIMIT 1000').bind(...(admin?[]:[u.id])).all<{id:string;user_id:string;kind:Feedback['kind'];payload:string;status:Feedback['status'];version:number;created_at:string;author_payload:string}>(),
  admin?sql.prepare('SELECT id,email,payload FROM cg_users ORDER BY created_at DESC LIMIT 1000').all<{id:string;email:string;payload:string}>():Promise.resolve(null)
 ]);
 const ownedVenueIds=new Set(v.results.filter(x=>JSON.parse(x.payload).ownerId===u.id).map(x=>JSON.parse(x.payload).id));
 const reviews=r.results.map(x=>{
  const review={...JSON.parse(x.payload),status:x.status,version:x.version};
  // Public review text never exposes another traveler's booking or account identifiers.
  const privateAccess=admin||review.userId===u.id||!tourist&&ownedVenueIds.has(review.venueId);
  return privateAccess?review:{...review,userId:'',bookingId:''};
 });
 const feedback:Feedback[]=tickets.results.map(x=>{const p=JSON.parse(x.payload);return {...p,id:x.id,userId:x.user_id,author:JSON.parse(x.author_payload).name,kind:x.kind,status:x.status,version:x.version,createdAt:x.created_at,updatedAt:p.updatedAt||x.created_at,reply:p.reply||''}});
 return {user:u,venues:v.results.map(x=>({...JSON.parse(x.payload),version:x.version})),bookings:b.results.map(x=>JSON.parse(x.payload)),favorites:f.results.map(x=>x.venue_id),reviews,feedback,...(people?{users:people.results.map(x=>({...JSON.parse(x.payload),id:x.id,email:x.email,role:x.id===u.id?'admin':JSON.parse(x.payload).role==='partner'?'partner':'tourist'}))}:{}),mode:'live',revision:new Date().toISOString()};
}
export function handleError(e:unknown){console.error(e instanceof AppError?e.code:e);return Response.json({error:e instanceof AppError?e.code:'storage_unavailable'},{status:e instanceof AppError?e.status:503})}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new AppError('forbidden',403)}
