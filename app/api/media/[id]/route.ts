import {profile,linkedMedia,AppError,handleError} from '@/lib/server';
import {list,storageRequest} from '@/lib/supabase/data';

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 try {
  const u=await profile();const {id}=await params;
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(id))throw new AppError('not_found',404);
  const rows=await list<{key:string;content_type:string;user_id:string}>(
    'cg_uploads',{id:'eq.'+id},'key,content_type,user_id');
  if(!rows.length)throw new AppError('not_found',404);
  const row=rows[0];
  if(row.user_id!==u.id&&u.role!=='admin'&&
     !await linkedMedia('/api/media/'+id,u.role==='partner'?u.id:undefined))
     throw new AppError('forbidden',403);
  const obj=await storageRequest('city-guide-photos/'+row.key);
  return new Response(obj.body,{headers:{
    'Content-Type':row.content_type,'X-Content-Type-Options':'nosniff',
    'Cache-Control':'private, no-cache'
  }});
 }catch(e){return handleError(e)}
}
