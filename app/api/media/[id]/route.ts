import {env} from 'cloudflare:workers';
import {profile,db,linkedMedia,AppError,handleError} from '@/lib/server';

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const u=await profile();const {id}=await params;
  const row=await db().prepare('SELECT key,content_type,user_id FROM cg_uploads WHERE id=?').bind(id).first<{key:string;content_type:string;user_id:string}>();
  if(!row)throw new AppError('not_found',404);
  if(row.user_id!==u.id&&u.role!=='admin'&&!await linkedMedia('/api/media/'+id,u.role==='partner'?u.id:undefined))throw new AppError('forbidden',403);
  const obj=await env.BUCKET?.get(row.key);if(!obj)throw new AppError('not_found',404);
  return new Response(obj.body,{headers:{'Content-Type':row.content_type,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-cache'}});
 }catch(e){return handleError(e)}
}
