import {profile,boundedBody,AppError,handleError,sameOrigin} from '@/lib/server';
import {insert,storageRequest} from '@/lib/supabase/data';

export async function POST(req:Request){
 try {
  sameOrigin(req);const u=await profile();
  if(u.role==='tourist')throw new AppError('forbidden',403);
  const body=await boundedBody(req,4500000,'image_too_large');
  let form:FormData;
  try{form=await new Request(req.url,{method:'POST',headers:req.headers,body}).formData()}
  catch{throw new AppError('invalid_image')}
  const f=form.get('file');
  if(!(f instanceof File)||!['image/jpeg','image/png','image/webp'].includes(f.type))
    throw new AppError('invalid_image');
  if(f.size>4*1024*1024)throw new AppError('image_too_large',413);
  const bytes=new Uint8Array(await f.arrayBuffer());
  const matches=(offset:number,signature:number[])=>signature.every((value,i)=>bytes[offset+i]===value);
  const valid=bytes.length>=32&&(f.type==='image/jpeg'?matches(0,[255,216,255]):
    f.type==='image/png'?matches(0,[137,80,78,71,13,10,26,10]):
    matches(0,[82,73,70,70])&&matches(8,[87,69,66,80]));
  if(!valid)throw new AppError('invalid_image');
  const id=crypto.randomUUID(),key='photos/'+id;
  await storageRequest('city-guide-photos/'+key,'POST',bytes,f.type);
  await insert('cg_uploads',[{id,user_id:u.id,key,content_type:f.type}]);
  return Response.json({url:'/api/media/'+id},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return handleError(e)}
}
