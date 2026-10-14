import {z} from 'zod';
import {AppError,profile,venue,canEdit,checkVenueMedia,boundedBody,seed,state,handleError,sameOrigin} from '@/lib/server';
import {list,insert,insertIgnore,patch,remove,dataRequest,DataError} from '@/lib/supabase/data';
import {venueInput,bookingInput} from '@/lib/validation';
import {isAdminEmail} from '@/lib/access-policy';
import {istanbulDate,isCategoryEnabled,venueLocations,type Venue,type Booking,type Review,type Profile} from '@/lib/model';
export const dynamic='force-dynamic';

function failConflict(rows:unknown[]){if(!rows.length)throw new AppError('conflict',409)}
function sameBooking(b:Booking,p:z.infer<typeof bookingInput>){
 const keys=['venueId','name','phone','date','time','guests','payment','note'] as const;
 return keys.every(key=>b[key]===p[key])&&((b.locationId||'main')===(p.locationId||'main'))&&b.endDate===(b.endDate===b.date?p.date:p.endDate);
}
export async function POST(req:Request){try{
 sameOrigin(req);
 const u=await profile();
 const input=z.object({
  action:z.enum(['saveVenue','favorite','book','bookingStatus','review','profile','feedback','venueStatus','userRole','moderateReview','reviewReply','feedbackStatus']),
  surface:z.enum(['admin','partner','tourist']).optional(),data:z.unknown()
 }).parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,200000))));
 await seed();const now=new Date().toISOString();let result:unknown=null;
 if(input.surface==='admin'&&u.role!=='admin'||input.surface==='partner'&&u.role==='tourist')throw new AppError('forbidden',403);

 if(input.action==='saveVenue'){
  if(u.role==='tourist')throw new AppError('forbidden',403);
  const p=venueInput.parse(input.data);
  if(!isCategoryEnabled(p.category))throw new AppError('unavailable');
  const old=p.id?await venue(p.id):null;
  if(old&&!canEdit(u,old))throw new AppError('forbidden',403);
  await checkVenueMedia(u,p);
  const status=u.role==='admin'?p.status:p.status==='published'?'pending':p.status;
  const v:Venue={...p,id:old?.id||crypto.randomUUID(),ownerId:old?.ownerId||u.id,
   isDemo:old?.isDemo||false,version:(old?.version||0)+1,status,updatedAt:now};
  const row={owner_id:v.ownerId,status:v.status,city:v.city,category:v.category,
   is_demo:v.isDemo,version:v.version,payload:v,updated_at:now};
  if(old){
   if(p.version!==old.version)throw new AppError('conflict',409);
   failConflict(await patch('cg_venues',{id:'eq.'+v.id,version:'eq.'+old.version},row));
  }else await insert('cg_venues',[{id:v.id,...row}]);
  result={id:v.id};

 }else if(input.action==='favorite'){
  const p=z.object({id:z.string().max(100),value:z.boolean()}).parse(input.data);
  if(p.value){
   const v=await venue(p.id);if(!isCategoryEnabled(v.category))throw new AppError('unavailable');
   if(v.status!=='published'&&!canEdit(u,v))throw new AppError('forbidden',403);
   await insertIgnore('cg_favorites',[{user_id:u.id,venue_id:p.id}],'user_id,venue_id');
  }else await remove('cg_favorites',{user_id:'eq.'+u.id,venue_id:'eq.'+p.id});

 }else if(input.action==='book'){
  const p=bookingInput.parse(input.data);
  const previous=()=>list<{user_id:string;payload:Booking}>('cg_bookings',{id:'eq.'+p.id});
  const retry=async(row:{user_id:string;payload:Booking})=>{
   if(row.user_id!==u.id)throw new AppError('forbidden',403);
   if(!sameBooking(row.payload,p))throw new AppError('idempotency_conflict',409);
   return Response.json({state:await state(input.surface),result:{id:p.id}},{headers:{'Cache-Control':'no-store'}});
  };
  const existing=await previous();if(existing.length)return await retry(existing[0]);
  const v=await venue(p.venueId);
  if(!isCategoryEnabled(v.category)||v.status!=='published'||v.bookingType==='none')throw new AppError('unavailable');
  const start=new Date(p.date+'T00:00:00Z');
  if(isNaN(start.getTime())||start.toISOString().slice(0,10)!==p.date||
     p.date<istanbulDate()||start.getTime()>Date.now()+366*86400000)throw new AppError('invalid_date');
  const period=v.bookingType==='rental'||v.bookingType==='stay';
  const end=period?p.endDate:p.date;
  if(period&&(!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<=p.date||
    new Date(end+'T00:00:00Z').toISOString().slice(0,10)!==end))throw new AppError('invalid_date');
  if(!period&&(v.open<v.close?(p.time<v.open||p.time>=v.close):
    (v.open>v.close&&p.time<v.open&&p.time>=v.close)))throw new AppError('outside_hours');
  if(new Date(p.date+'T'+p.time+':00+03:00').getTime()<Date.now())throw new AppError('invalid_date');
  const points=venueLocations(v);
  const selectedPoint=points.find(point=>point.id===(p.locationId||points[0].id));
  if(!selectedPoint)throw new AppError('invalid_location',400);
  const days=period?(Date.parse(end)-start.getTime())/86400000:1;
  if(days>90)throw new AppError('invalid_date');
  const total=Math.round(v.price*(period?days:v.bookingType==='ticket'?p.guests:1)*(1-v.discount/100)*100)/100;
  const b:Booking={...p,locationId:selectedPoint.id,locationLabel:selectedPoint.label,endDate:end,venueName:v.name,userId:u.id,status:'pending',
   total,currency:v.currency,isDemo:true,createdAt:now};
  const output=await dataRequest<{id:string;duplicate:boolean}>('/rest/v1/rpc/cg_book_atomic',
    'POST',{}, {p_booking:b,p_user_id:u.id,p_expected_version:v.version});
  if(output.duplicate){const r=await previous();if(r.length)return await retry(r[0]);}
  result={id:output.id};

 }else if(input.action==='bookingStatus'){
  const p=z.object({id:z.string().uuid(),status:z.enum(['confirmed','cancelled','completed'])}).parse(input.data);
  const rows=await list<{payload:Booking;status:string}>('cg_bookings',{id:'eq.'+p.id});
  if(!rows.length)throw new AppError('not_found',404);
  const b=rows[0].payload;const v=await venue(b.venueId);
  if(!canEdit(u,v)&&!(b.userId===u.id&&p.status==='cancelled'))throw new AppError('forbidden',403);
  if(!({pending:['confirmed','cancelled'],confirmed:['completed','cancelled'],completed:[],cancelled:[]} as Record<string,string[]>)[rows[0].status]?.includes(p.status))throw new AppError('invalid_transition',409);
  failConflict(await patch('cg_bookings',{id:'eq.'+p.id,status:'eq.'+rows[0].status},
    {status:p.status,payload:{...b,status:p.status}}));

 }else if(input.action==='review'){
  const p=z.object({bookingId:z.string().uuid(),rating:z.number().int().min(1).max(5),
    text:z.string().trim().min(3).max(2000)}).parse(input.data);
  const rows=await list<{payload:Booking}>('cg_bookings',
    {id:'eq.'+p.bookingId,user_id:'eq.'+u.id,status:'eq.completed'});
  if(!rows.length)throw new AppError('visit_required');
  const b=rows[0].payload;
  const existing=await list('cg_reviews',{booking_id:'eq.'+p.bookingId},'id');
  if(existing.length)throw new AppError('already_reviewed');
  const r:Review={id:crypto.randomUUID(),venueId:b.venueId,bookingId:b.id,userId:u.id,
   author:u.name,rating:p.rating,text:p.text,createdAt:now,isDemo:b.isDemo};
  try{await insert('cg_reviews',[{id:r.id,user_id:u.id,venue_id:r.venueId,
    booking_id:b.id,payload:r,created_at:now}])}
  catch(e){if(e instanceof DataError&&e.status===409)throw new AppError('already_reviewed');throw e}

 }else if(input.action==='profile'){
  const p=z.object({name:z.string().trim().min(2).max(150),phone:z.string().max(40),
   language:z.enum(['ru','tr','en']),homeAddress:z.string().max(500)}).parse(input.data);
  failConflict(await patch('cg_users',{id:'eq.'+u.id},{payload:{...u,...p}}));

 }else if(input.action==='feedback'){
  const p=z.object({kind:z.enum(['app','help']),rating:z.number().int().min(0).max(5),
   text:z.string().trim().min(3).max(2000)}).parse(input.data);
  if(p.kind==='app'&&p.rating===0)throw new AppError('invalid_input');
  await insert('cg_feedback',[{id:crypto.randomUUID(),user_id:u.id,kind:p.kind,payload:p,created_at:now}]);

 }else if(input.action==='venueStatus'){
  if(u.role!=='admin')throw new AppError('forbidden',403);
  const p=z.object({id:z.string().max(100),status:z.enum(['draft','pending','published','archived']),
   version:z.number().int().min(1)}).parse(input.data);
  const v=await venue(p.id);if(v.version!==p.version)throw new AppError('conflict',409);
  const updated={...v,status:p.status,version:v.version+1,updatedAt:now};
  failConflict(await patch('cg_venues',{id:'eq.'+p.id,version:'eq.'+p.version},
   {status:p.status,version:updated.version,payload:updated,updated_at:now}));

 }else if(input.action==='userRole'){
  if(u.role!=='admin')throw new AppError('forbidden',403);
  const p=z.object({id:z.string().uuid(),role:z.enum(['partner','tourist']),
   expectedRole:z.enum(['partner','tourist'])}).parse(input.data);
  if(p.id===u.id)throw new AppError('owner_locked',409);
  const rows=await list<{email:string;role:'partner'|'tourist';payload:Profile}>('cg_users',{id:'eq.'+p.id});
  if(!rows.length)throw new AppError('not_found',404);
  if(isAdminEmail(rows[0].email))throw new AppError('owner_locked',409);
  if(rows[0].role!==p.expectedRole)throw new AppError('conflict',409);
  failConflict(await patch('cg_users',{id:'eq.'+p.id,role:'eq.'+p.expectedRole},
    {role:p.role,payload:{...rows[0].payload,role:p.role}}));

 }else if(input.action==='moderateReview'||input.action==='reviewReply'){
  const p=z.object({id:z.string().uuid(),version:z.number().int().min(1),
   status:z.enum(['published','hidden']).optional(),reply:z.string().trim().max(2000).optional()}).parse(input.data);
  const rows=await list<{payload:Review;status:'published'|'hidden';version:number}>('cg_reviews',{id:'eq.'+p.id});
  if(!rows.length)throw new AppError('not_found',404);
  const r=rows[0];
  if(input.action==='moderateReview'&&u.role!=='admin'||
     input.action==='reviewReply'&&!canEdit(u,await venue(r.payload.venueId)))throw new AppError('forbidden',403);
  if(r.version!==p.version)throw new AppError('conflict',409);
  const status=input.action==='moderateReview'?(p.status||r.status):r.status;
  failConflict(await patch('cg_reviews',{id:'eq.'+p.id,version:'eq.'+p.version},
    {status,version:r.version+1,payload:{...r.payload,
      ...(p.reply!==undefined?{reply:p.reply}:{}),status,version:r.version+1}}));

 }else if(input.action==='feedbackStatus'){
  if(u.role!=='admin')throw new AppError('forbidden',403);
  const p=z.object({id:z.string().uuid(),version:z.number().int().min(1),
   status:z.enum(['open','in_progress','resolved']),reply:z.string().trim().max(2000)}).parse(input.data);
  const rows=await list<{payload:object;version:number}>('cg_feedback',{id:'eq.'+p.id});
  if(!rows.length)throw new AppError('not_found',404);
  if(rows[0].version!==p.version)throw new AppError('conflict',409);
  failConflict(await patch('cg_feedback',{id:'eq.'+p.id,version:'eq.'+p.version},
    {status:p.status,version:p.version+1,
      payload:{...rows[0].payload,reply:p.reply,updatedAt:now}}));

 }else throw new AppError('invalid_action');
 return Response.json({state:await state(input.surface),result},{headers:{'Cache-Control':'no-store'}});
}catch(e){if(e instanceof z.ZodError||e instanceof SyntaxError||e instanceof RangeError)
 return Response.json({error:'invalid_input'},{status:400});return handleError(e)}}
