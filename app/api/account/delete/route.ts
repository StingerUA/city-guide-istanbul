import {z} from 'zod';
import {env} from 'cloudflare:workers';
import {jsonBody,enforceLimit} from '@/lib/http-security';
import {AppError,profile,handleError,sameOrigin} from '@/lib/server';
import {list,patch,remove,storageRequest} from '@/lib/supabase/data';
import {supabaseConfig} from '@/lib/supabase/config';
import {clearSession} from '@/lib/supabase/sessions';
import {isAdminEmail} from '@/lib/access-policy';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};

/** Состояние для страницы /delete-account: кто вошёл и можно ли удалить. */
export async function GET(){try{
 const u=await profile();
 return Response.json({email:u.email,role:u.role,canDelete:!isAdminEmail(u.email)},{headers:noStore});
}catch(e){return handleError(e)}}

/** Удаляет пользователя из Supabase Auth. Таблицы с user_id удаляются каскадом (on delete cascade). */
async function deleteAuthUser(id:string){
 const cfg=supabaseConfig();
 const secret=(env as unknown as Record<string,string|undefined>).SUPABASE_SECRET_KEY||process.env.SUPABASE_SECRET_KEY;
 if(!cfg||!secret||!secret.startsWith('sb_secret_'))throw new AppError('storage_unavailable',503);
 let r:Response;
 try{
  r=await fetch(cfg.url+'/auth/v1/admin/users/'+encodeURIComponent(id),{
   method:'DELETE',headers:{apikey:secret},cache:'no-store',signal:AbortSignal.timeout(10000)
  });
 }catch{throw new AppError('storage_unavailable',503)}
 if(!r.ok&&r.status!==404)throw new AppError('storage_unavailable',502);
}

export async function POST(req:Request){try{
 sameOrigin(req);
 const u=await profile();
 await enforceLimit(env.USER_WRITE_RATE_LIMITER,'delete:'+u.id);
 const input=z.object({email:z.string().trim().max(254)}).strict().parse(await jsonBody(req,2048));
 // Владельцев проекта (админов) нельзя удалить самообслуживанием.
 if(isAdminEmail(u.email))throw new AppError('owner_locked',409);
 if(input.email.toLowerCase()!==u.email.toLowerCase())throw new AppError('email_mismatch',400);
 const uid=u.id,now=new Date().toISOString();

 // Ключи фотографий нужно запомнить заранее: строки cg_uploads исчезнут вместе с аккаунтом.
 const uploads=await list<{key:string}>('cg_uploads',{user_id:'eq.'+uid},'key');

 // Порядок важен: отзывы ссылаются на бронирования, поэтому сначала отзывы.
 await remove('cg_reviews',{user_id:'eq.'+uid});
 await remove('cg_feedback',{user_id:'eq.'+uid});
 await remove('cg_favorites',{user_id:'eq.'+uid});
 await remove('cg_bookings',{user_id:'eq.'+uid});

 // Заведения партнёра остаются в базе (на них могут ссылаться чужие бронирования), но снимаются
 // с публикации, отвязываются от аккаунта и теряют телефон и сайт.
 const owned=await list<{id:string;version:number;payload:Record<string,unknown>}>(
  'cg_venues',{owner_id:'eq.'+uid},'id,version,payload');
 for(const v of owned){
  const version=v.version+1;
  await patch('cg_venues',{id:'eq.'+v.id,version:'eq.'+v.version},{
   status:'archived',owner_id:'deleted',version,updated_at:now,
   payload:{...v.payload,status:'archived',ownerId:'deleted',phone:'',website:'',version,updatedAt:now}
  });
 }

 // Главный шаг. Если он не удался, пользователь увидит ошибку и сможет повторить попытку:
 // все предыдущие шаги безопасно повторяются.
 await deleteAuthUser(uid);

 // Файлы фотографий в хранилище Supabase удаляем после успеха; ошибки не прерывают ответ.
 const results=await Promise.allSettled(uploads.map(x=>storageRequest('city-guide-photos/'+x.key,'DELETE')));
 const failed=results.filter(x=>x.status==='rejected').length;
 if(failed)console.error(JSON.stringify({event:'account_delete_storage_cleanup_failed',count:failed}));
 console.info(JSON.stringify({event:'account_deleted'}));

 await clearSession();
 return Response.json({ok:true},{headers:noStore});
}catch(e){
 if(e instanceof z.ZodError||e instanceof SyntaxError||e instanceof RangeError)
  return Response.json({error:'invalid_input'},{status:400,headers:noStore});
 return handleError(e);
}}
