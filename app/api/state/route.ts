import {state,handleError,AppError} from '@/lib/server';
import type {Surface} from '@/lib/model';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const surface=new URL(req.url).searchParams.get('surface');if(surface&&!['admin','partner','tourist'].includes(surface))throw new AppError('invalid_input');return Response.json(await state((surface||undefined) as Surface|undefined),{headers:{'Cache-Control':'no-store'}})}catch(e){return handleError(e)}}
