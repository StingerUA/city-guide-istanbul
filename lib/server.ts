import {getSupabaseUser} from '@/lib/supabase/auth';
import {list,insertIgnore,DataError} from '@/lib/supabase/data';
import {accountRole} from './access-policy';
import {demoVenues,isCategoryEnabled,type Venue,type Profile,type AppState,type Surface,type Feedback,type Review,type Booking} from './model';

export class AppError extends Error { constructor(public code:string,public status=400){super(code)} }
type JsonRow={payload:unknown;version?:number;status?:string;id?:string;user_id?:string;venue_id?:string;created_at?:string;kind?:string};
export async function actor(){const u=await getSupabaseUser();if(!u)throw new AppError('signin_required',401);return u}
export async function profile():Promise<Profile>{
 const user=await actor();
 let rows=await list<{id:string;email:string;role:'partner'|'tourist';payload:Profile}>(
   'cg_users',{id:'eq.'+user.userId});
 if(!rows.length){
   const initial:Profile={id:user.userId,name:user.fullName||'City Guide',email:user.email,phone:'',language:'ru',homeAddress:'',role:'tourist'};
   await insertIgnore('cg_users',[{id:user.userId,email:user.email,role:'tourist',payload:initial}],'id');
   rows=await list('cg_users',{id:'eq.'+user.userId});
 }
 if(!rows.length)throw new AppError('storage_unavailable',503);
 const saved=rows[0];
 return {...saved.payload,id:user.userId,email:user.email,
   role:accountRole(user.email,saved.role)};
}
export async function seed(){
 // On a fresh installation only; never overwrite content edited by staff.
 const existing=await list<{key:string}>('cg_meta',{key:'eq.seed_v1'},'key');
 if(existing.length)return;
 await insertIgnore('cg_venues',demoVenues.map(v=>({
   id:v.id,owner_id:v.ownerId,status:v.status,city:v.city,category:v.category,
   is_demo:true,version:1,payload:v,updated_at:v.updatedAt
 })),'id');
 await insertIgnore('cg_meta',[{key:'seed_v1',value:'done'}],'key');
}
export async function venue(id:string):Promise<Venue>{
 const rows=await list<{payload:Venue;version:number}>('cg_venues',{id:'eq.'+id});
 if(!rows.length)throw new AppError('not_found',404);
 return {...rows[0].payload,version:rows[0].version};
}
export function canEdit(u:Profile,v:Venue){return u.role==='admin'||(u.role==='partner'&&v.ownerId===u.id)}
export async function linkedMedia(url:string,ownerId?:string){
 const rows=await list<{payload:Venue;status:string;owner_id:string}>('cg_venues',
   {or:'(status.eq.published,owner_id.eq.'+(ownerId||'00000000-0000-0000-0000-000000000000')+')'},
   'payload,status,owner_id');
 return rows.some(({payload:v})=>
   v.image===url||v.gallery?.includes(url)||v.services?.some(s=>s.image===url));
}
export async function checkVenueMedia(u:Profile,v:{image:string;gallery:string[];services:{image:string}[]}){
 const refs=[...new Set([v.image,...v.gallery,...v.services.map(s=>s.image)].filter(s=>s.startsWith('/api/media/')))];
 if(!refs.length)return;
 // One Supabase request for all photos; large partner galleries must not trigger 60 sequential lookups.
 const prefix='/api/media/';
 const ids=refs.map(url=>url.slice(prefix.length));
 const rows=await list<{id:string;user_id:string}>('cg_uploads',{id:'in.('+ids.join(',')+')'},'id,user_id');
 const owners=new Map(rows.map(row=>[row.id,row.user_id]));
 for(const url of refs){
  const id=url.slice(prefix.length),owner=owners.get(id);
  if(!owner)throw new AppError('invalid_image');
  if(u.role!=='admin'&&owner!==u.id&&
     !await linkedMedia(url,u.role==='partner'?u.id:undefined))
    throw new AppError('forbidden',403);
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
 const u=await profile();await seed();
 if(surface==='admin'&&u.role!=='admin')throw new AppError('forbidden',403);
 if(surface==='partner'&&u.role==='tourist')throw new AppError('forbidden',403);
 const tourist=surface==='tourist'||u.role==='tourist';
 const admin=u.role==='admin'&&!tourist&&surface!=='partner';
 const partner=!tourist&&!admin;
 const vr=await list<{payload:Venue;version:number}>('cg_venues',
   tourist?{status:'eq.published'}:admin?{}:{or:'(status.eq.published,owner_id.eq.'+u.id+')'});
 const allVenues=vr.map(x=>({...x.payload,version:x.version} as Venue));
 const visible=allVenues.filter(v=>isCategoryEnabled(v.category));
 const owned=new Set(visible.filter(v=>v.ownerId===u.id).map(v=>v.id));
 const [br,fr,rr,tr,people]=await Promise.all([
   list<{payload:Booking}>('cg_bookings',
     admin?{}:tourist?{user_id:'eq.'+u.id}:{or:'(user_id.eq.'+u.id+
       (owned.size?',venue_id.in.('+[...owned].join(',')+')':'')+')'},
     'payload'),
   list<{venue_id:string}>('cg_favorites',{user_id:'eq.'+u.id},'venue_id'),
   list<{payload:Review;status:Review['status'];version:number;user_id:string;venue_id:string}>('cg_reviews',{},'payload,status,version,user_id,venue_id'),
   list<{payload:Feedback;id:string;user_id:string;kind:Feedback['kind'];status:Feedback['status'];version:number;created_at:string}>(
     'cg_feedback',admin?{}:{user_id:'eq.'+u.id}),
   admin?list<{id:string;email:string;role:'tourist'|'partner';payload:Profile}>('cg_users'):Promise.resolve([])
 ]);
 const publicVenues=new Set(allVenues.filter(v=>v.status==='published').map(v=>v.id));
 const reviews=rr.filter(r=>admin||r.user_id===u.id||partner&&owned.has(r.venue_id)||
    r.status==='published'&&publicVenues.has(r.venue_id)).map(r=>{
   const p={...r.payload,status:r.status,version:r.version};
   return admin||r.user_id===u.id||partner&&owned.has(r.venue_id)
     ?p:{...p,userId:'',bookingId:''};
 });
 const profiles=new Map(people.map(p=>[p.id,p.payload.name]));
 const feedback:Feedback[]=tr.map(t=>({...t.payload,id:t.id,userId:t.user_id,
   author:profiles.get(t.user_id)||u.name,kind:t.kind,status:t.status,
   version:t.version,createdAt:t.created_at,updatedAt:t.payload.updatedAt||t.created_at,
   reply:t.payload.reply||''}));
 return {user:u,venues:visible,
   bookings:br.map(x=>x.payload).filter(b=>admin||b.userId===u.id||partner&&owned.has(b.venueId)),
   favorites:fr.map(x=>x.venue_id),reviews,feedback,
   ...(admin?{users:people.map(x=>({...x.payload,id:x.id,email:x.email,role:accountRole(x.email,x.role)}))}:{}),
   mode:'live',revision:new Date().toISOString()};
}
export function handleError(e:unknown){
 console.error(e instanceof AppError||e instanceof DataError?e.code:e);
 if(e instanceof AppError)return Response.json({error:e.code},{status:e.status});
 if(e instanceof DataError)return Response.json({error:e.code},{status:e.status});
 return Response.json({error:'storage_unavailable'},{status:503});
}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new AppError('forbidden',403)}
