import {z} from 'zod';
import {AppError,profile,db,venue,canEdit,checkVenueMedia,boundedBody,seed,state,handleError,sameOrigin} from '@/lib/server';
import {venueInput,bookingInput} from '@/lib/validation';
import {istanbulDate,type Venue,type Booking,type Review} from '@/lib/model';
export const dynamic='force-dynamic';
function sameBooking(b:Booking,p:z.infer<typeof bookingInput>){
 const keys=['venueId','name','phone','date','time','guests','payment','note'] as const;
 return keys.every(key=>b[key]===p[key])&&b.endDate===(b.endDate===b.date?p.date:p.endDate);
}
export async function POST(req:Request){try{
 sameOrigin(req);const u=await profile();
 const input=z.object({action:z.enum(['saveVenue','favorite','book','bookingStatus','review','profile','feedback','venueStatus','userRole','moderateReview','reviewReply','feedbackStatus']),surface:z.enum(['admin','partner','tourist']).optional(),data:z.unknown()}).parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,200000))));await seed();const sql=db();const now=new Date().toISOString();let result:unknown=null;
 if(input.surface==='admin'&&u.role!=='admin'||input.surface==='partner'&&u.role==='tourist')throw new AppError('forbidden',403);
 if(input.action==='saveVenue'){
  if(u.role==='tourist')throw new AppError('forbidden',403);
  const p=venueInput.parse(input.data);const old=p.id?await venue(p.id):null;if(old&&!canEdit(u,old))throw new AppError('forbidden',403);await checkVenueMedia(u,p);
  const status=u.role==='admin'?p.status:p.status==='published'?'pending':p.status;
  const v:Venue={...p,id:old?.id||crypto.randomUUID(),ownerId:old?.ownerId||u.id,isDemo:old?.isDemo||false,version:(old?.version||0)+1,status,updatedAt:now};
  if(old){if(p.version!==old.version)throw new AppError('conflict',409);const r=await sql.prepare('UPDATE cg_venues SET status=?,city=?,category=?,version=?,payload=?,updated_at=? WHERE id=? AND version=?').bind(v.status,v.city,v.category,v.version,JSON.stringify(v),now,v.id,old.version).run();if(!r.meta.changes)throw new AppError('conflict',409)}
  else await sql.prepare('INSERT INTO cg_venues (id,owner_id,status,city,category,is_demo,version,payload,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(v.id,v.ownerId,v.status,v.city,v.category,0,1,JSON.stringify(v),now).run();result={id:v.id};
 }else if(input.action==='favorite'){
  const p=z.object({id:z.string().max(100),value:z.boolean()}).parse(input.data);
  if(p.value){const v=await venue(p.id);if(v.status!=='published'&&!canEdit(u,v))throw new AppError('forbidden',403);await sql.prepare('INSERT OR IGNORE INTO cg_favorites (user_id,venue_id) VALUES (?,?)').bind(u.id,p.id).run()}
  else await sql.prepare('DELETE FROM cg_favorites WHERE user_id=? AND venue_id=?').bind(u.id,p.id).run();
 }else if(input.action==='book'){
  const p=bookingInput.parse(input.data);
  const previous=()=>sql.prepare('SELECT user_id,payload FROM cg_bookings WHERE id=?').bind(p.id).first<{user_id:string;payload:string}>();
  const retry=async(row:{user_id:string;payload:string})=>{if(row.user_id!==u.id)throw new AppError('forbidden',403);if(!sameBooking(JSON.parse(row.payload),p))throw new AppError('idempotency_conflict',409);return Response.json({state:await state(input.surface),result:{id:p.id}},{headers:{'Cache-Control':'no-store'}})};
  const existing=await previous();if(existing)return await retry(existing);
  const v=await venue(p.venueId);if(v.status!=='published'||v.bookingType==='none')throw new AppError('unavailable');
  const start=new Date(p.date+'T00:00:00Z');if(isNaN(start.getTime())||start.toISOString().slice(0,10)!==p.date||p.date<istanbulDate()||start.getTime()>Date.now()+366*86400000)throw new AppError('invalid_date');
  const period=v.bookingType==='rental'||v.bookingType==='stay';const end=period?p.endDate:p.date;
  if(period&&(!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<=p.date||new Date(end+'T00:00:00Z').toISOString().slice(0,10)!==end))throw new AppError('invalid_date');
  if(!period&&(v.open<v.close?(p.time<v.open||p.time>=v.close):(v.open>v.close&&p.time<v.open&&p.time>=v.close)))throw new AppError('outside_hours');
  if(new Date(p.date+'T'+p.time+':00+03:00').getTime()<Date.now())throw new AppError('invalid_date');
  const qty=period||v.bookingType==='appointment'?1:p.guests;const days=period?(Date.parse(end)-start.getTime())/86400000:1;if(days>90)throw new AppError('invalid_date');
  const total=Math.round(v.price*(period?days:v.bookingType==='ticket'?p.guests:1)*(1-v.discount/100)*100)/100;
  const b:Booking={...p,endDate:end,venueName:v.name,userId:u.id,status:'pending',total,currency:v.currency,isDemo:true,createdAt:now};
  const range=period?'date < ? AND end_date > ?':'date = ? AND time = ?';
  const r=await sql.prepare(`INSERT INTO cg_bookings (id,user_id,venue_id,date,end_date,time,guests,status,payload,created_at) SELECT ?,?,?,?,?,?,?,?, ?,? WHERE COALESCE((SELECT SUM(guests) FROM cg_bookings WHERE venue_id=? AND status IN ('pending','confirmed') AND ${range}),0)+?<=? AND EXISTS(SELECT 1 FROM cg_venues WHERE id=? AND status='published' AND version=?) ON CONFLICT(id) DO NOTHING`).bind(b.id,u.id,v.id,p.date,end,p.time,qty,'pending',JSON.stringify(b),now,v.id,...(period?[end,p.date]:[p.date,p.time]),qty,v.capacity,v.id,v.version).run();
  if(!r.meta.changes){const duplicate=await previous();if(duplicate)return await retry(duplicate);if((await venue(v.id)).version!==v.version)throw new AppError('conflict',409);throw new AppError('fully_booked',409)}result={id:b.id};
 }else if(input.action==='bookingStatus'){
  const p=z.object({id:z.string().uuid(),status:z.enum(['confirmed','cancelled','completed'])}).parse(input.data);const row=await sql.prepare('SELECT payload,status FROM cg_bookings WHERE id=?').bind(p.id).first<{payload:string;status:string}>();if(!row)throw new AppError('not_found',404);const b:Booking=JSON.parse(row.payload);const v=await venue(b.venueId);
  if(!canEdit(u,v)&&!(b.userId===u.id&&p.status==='cancelled'))throw new AppError('forbidden',403);
  if(!({pending:['confirmed','cancelled'],confirmed:['completed','cancelled'],completed:[],cancelled:[]} as Record<string,string[]>)[row.status]?.includes(p.status))throw new AppError('invalid_transition',409);
  b.status=p.status;const r=await sql.prepare('UPDATE cg_bookings SET status=?,payload=? WHERE id=? AND status=?').bind(p.status,JSON.stringify(b),p.id,row.status).run();if(!r.meta.changes)throw new AppError('conflict',409);
 }else if(input.action==='review'){
  const p=z.object({bookingId:z.string().uuid(),rating:z.number().int().min(1).max(5),text:z.string().trim().min(3).max(2000)}).parse(input.data);const row=await sql.prepare('SELECT payload FROM cg_bookings WHERE id=? AND user_id=? AND status=?').bind(p.bookingId,u.id,'completed').first<{payload:string}>();if(!row)throw new AppError('visit_required');
  const b:Booking=JSON.parse(row.payload);const r:Review={id:crypto.randomUUID(),venueId:b.venueId,bookingId:b.id,userId:u.id,author:u.name,rating:p.rating,text:p.text,createdAt:now,isDemo:b.isDemo};const saved=await sql.prepare('INSERT OR IGNORE INTO cg_reviews (id,user_id,venue_id,booking_id,payload,created_at) VALUES (?,?,?,?,?,?)').bind(r.id,u.id,r.venueId,b.id,JSON.stringify(r),now).run();if(!saved.meta.changes)throw new AppError('already_reviewed');
 }else if(input.action==='profile'){
  const p=z.object({name:z.string().trim().min(2).max(150),phone:z.string().max(40),language:z.enum(['ru','tr','en']),homeAddress:z.string().max(500)}).parse(input.data);await sql.prepare("UPDATE cg_users SET payload=json_set(payload,'$.name',?,'$.phone',?,'$.language',?,'$.homeAddress',?) WHERE id=?").bind(p.name,p.phone,p.language,p.homeAddress,u.id).run();
 }else if(input.action==='feedback'){
  const p=z.object({kind:z.enum(['app','help']),rating:z.number().int().min(0).max(5),text:z.string().trim().min(3).max(2000)}).parse(input.data);if(p.kind==='app'&&p.rating===0)throw new AppError('invalid_input');await sql.prepare('INSERT INTO cg_feedback (id,user_id,kind,payload,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),u.id,p.kind,JSON.stringify(p),now).run();
 }else if(input.action==='venueStatus'){
  if(u.role!=='admin')throw new AppError('forbidden',403);
  const p=z.object({id:z.string().max(100),status:z.enum(['draft','pending','published','archived']),version:z.number().int().min(1)}).parse(input.data);const v=await venue(p.id);
  if(v.version!==p.version)throw new AppError('conflict',409);
  const updated={...v,status:p.status,version:v.version+1,updatedAt:now};const r=await sql.prepare('UPDATE cg_venues SET status=?,version=?,payload=?,updated_at=? WHERE id=? AND version=?').bind(p.status,updated.version,JSON.stringify(updated),now,p.id,p.version).run();if(!r.meta.changes)throw new AppError('conflict',409);
 }else if(input.action==='userRole'){
  if(u.role!=='admin')throw new AppError('forbidden',403);
  const p=z.object({id:z.string().max(100),role:z.enum(['partner','tourist']),expectedRole:z.enum(['partner','tourist'])}).parse(input.data);
  if(p.id===u.id)throw new AppError('owner_locked',409);
  const row=await sql.prepare('SELECT payload FROM cg_users WHERE id=?').bind(p.id).first<{payload:string}>();if(!row)throw new AppError('not_found',404);
  const saved=JSON.parse(row.payload);const role=saved.role==='partner'?'partner':'tourist';if(role!==p.expectedRole)throw new AppError('conflict',409);
  const r=await sql.prepare('UPDATE cg_users SET payload=? WHERE id=? AND payload=?').bind(JSON.stringify({...saved,role:p.role}),p.id,row.payload).run();if(!r.meta.changes)throw new AppError('conflict',409);
 }else if(input.action==='moderateReview'||input.action==='reviewReply'){
  const p=z.object({id:z.string().uuid(),version:z.number().int().min(1),status:z.enum(['published','hidden']).optional(),reply:z.string().trim().max(2000).optional()}).parse(input.data);
  const row=await sql.prepare('SELECT payload,status,version FROM cg_reviews WHERE id=?').bind(p.id).first<{payload:string;status:string;version:number}>();if(!row)throw new AppError('not_found',404);const review:Review=JSON.parse(row.payload);
  if(input.action==='moderateReview'&&u.role!=='admin'||input.action==='reviewReply'&&!canEdit(u,await venue(review.venueId)))throw new AppError('forbidden',403);
  if(row.version!==p.version)throw new AppError('conflict',409);
  const status=input.action==='moderateReview'?(p.status||row.status):row.status;const updated={...review,...(p.reply!==undefined?{reply:p.reply}:{}),status,version:row.version+1};
  const r=await sql.prepare('UPDATE cg_reviews SET payload=?,status=?,version=? WHERE id=? AND version=?').bind(JSON.stringify(updated),status,updated.version,p.id,p.version).run();if(!r.meta.changes)throw new AppError('conflict',409);
 }else if(input.action==='feedbackStatus'){
  if(u.role!=='admin')throw new AppError('forbidden',403);
  const p=z.object({id:z.string().uuid(),version:z.number().int().min(1),status:z.enum(['open','in_progress','resolved']),reply:z.string().trim().max(2000)}).parse(input.data);
  const row=await sql.prepare('SELECT payload,version FROM cg_feedback WHERE id=?').bind(p.id).first<{payload:string;version:number}>();if(!row)throw new AppError('not_found',404);if(row.version!==p.version)throw new AppError('conflict',409);
  const r=await sql.prepare('UPDATE cg_feedback SET payload=?,status=?,version=? WHERE id=? AND version=?').bind(JSON.stringify({...JSON.parse(row.payload),reply:p.reply,updatedAt:now}),p.status,p.version+1,p.id,p.version).run();if(!r.meta.changes)throw new AppError('conflict',409);
 }else throw new AppError('invalid_action');
 return Response.json({state:await state(input.surface),result},{headers:{'Cache-Control':'no-store'}});
}catch(e){if(e instanceof z.ZodError||e instanceof SyntaxError||e instanceof RangeError)return Response.json({error:'invalid_input'},{status:400});return handleError(e)}}
