import {env} from 'cloudflare:workers';
import {profile,AppError,handleError,jsonBody} from '@/lib/server';
import {dataRequest,insert,list} from '@/lib/supabase/data';

const MONTHLY_LIMIT=4.50;
const REQUEST_RESERVE=0.01;
const MODEL='gemini-2.5-flash';
type MessageRow={role:'user'|'assistant';content:string};
type VenueRow={payload:{name?:string;city?:string;district?:string;category?:string;address?:string;description?:Record<string,string>;price?:number;currency?:string;open?:string;close?:string;phone?:string;website?:string};status:string;is_demo:boolean};
const personality=`You are City Guide, an intelligent urban companion for visitors and residents. Your personality: observant, culturally curious, composed, warm but never clingy, practical, discreet, and intellectually engaging. You are not a generic chatbot or pushy salesperson.
Speak the user's language (Russian, Turkish, or English) and adapt naturally. Give clear, useful answers with concise structure. Ask one clarifying question only when needed. Help discover places, compare options, plan realistic routes, explain local culture and etiquette, translate useful phrases, suggest accessible alternatives, prepare day plans, and help users make decisions.
Use the supplied City Guide catalogue as your source for listed venues. Never invent venue details, opening hours, prices, addresses, ratings, availability, or booking confirmations. Clearly distinguish catalogue facts from general suggestions. If the catalogue lacks data, say so and offer a practical next step. Do not claim to have checked live traffic, weather, maps, or reservations unless a tool result is explicitly supplied. Do not request sensitive personal data. For emergencies, direct users to local emergency services and avoid pretending to dispatch help.
Current date: ${new Date().toISOString().slice(0,10)}. Current city context: Istanbul unless the user says otherwise.`;

export async function POST(req:Request){
 let monthKey='',reserved=false,conversationId:string|undefined;
 try{
  const user=await profile();
  const body=await jsonBody(req,12000) as {message?:unknown;conversationId?:unknown;lang?:unknown};
  if(typeof body.message!=='string'||!body.message.trim()||body.message.length>1800)throw new AppError('invalid_input',400);
  const message=body.message.trim();
  const runtime=env as unknown as Record<string,string|undefined>;
  const apiKey=runtime.GEMINI_API_KEY;
  if(!apiKey)throw new AppError('ai_not_configured',503);
  monthKey=new Date().toISOString().slice(0,7);
  const ok=await dataRequest<boolean>('/rest/v1/rpc/cg_ai_reserve','POST',{},{
   p_month:monthKey,p_amount:REQUEST_RESERVE,p_limit:MONTHLY_LIMIT
  });
  if(!ok)throw new AppError('ai_monthly_budget_reached',429);
  reserved=true;

  if(typeof body.conversationId==='string'&&/^[0-9a-f-]{36}$/i.test(body.conversationId)){
   const existing=await list<{id:string}>('cg_ai_conversations',{id:'eq.'+body.conversationId,user_id:'eq.'+user.id},'id');
   if(existing.length)conversationId=existing[0].id;
  }
  if(!conversationId){
   const created=await insert<{id:string}>('cg_ai_conversations',[{user_id:user.id,title:message.slice(0,72)}]);
   conversationId=created[0]?.id;
   if(!conversationId)throw new AppError('storage_unavailable',503);
  }
  await insert('cg_ai_messages',[{conversation_id:conversationId,user_id:user.id,role:'user',content:message}]);
  const [history,venues]=await Promise.all([
   list<MessageRow>('cg_ai_messages',{conversation_id:'eq.'+conversationId,user_id:'eq.'+user.id,order:'created_at.desc',limit:'12'},'role,content'),
   list<VenueRow>('cg_venues',{status:'eq.published',select:'payload,status,is_demo',limit:'35'})
  ]);
  const catalogue=venues.map(v=>v.payload).filter(v=>v?.name).map(v=>({
   name:v.name,city:v.city,district:v.district,category:v.category,address:v.address,
   description:v.description?.[(body.lang==='tr'?'tr':body.lang==='en'?'en':'ru')]||v.description?.tr||v.description?.en,
   price:v.price,currency:v.currency,open:v.open,close:v.close,phone:v.phone,website:v.website
  }));
  const contents=[...history.reverse().map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]}))];
  const prompt=`Published City Guide catalogue (may be incomplete): ${JSON.stringify(catalogue).slice(0,6500)}\n\nUser's latest message: ${message}`;
  contents.push({role:'user',parts:[{text:prompt}]});
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent',{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
   body:JSON.stringify({
    system_instruction:{parts:[{text:personality}]},
    contents,
    generationConfig:{temperature:0.65,maxOutputTokens:550,topP:0.9}
   }),
   signal:AbortSignal.timeout(25000)
  });
  if(!response.ok)throw new AppError(response.status===429?'ai_provider_busy':'ai_provider_error',503);
  const result=await response.json() as {candidates?:{content?:{parts?:{text?:string}[]}}[];usageMetadata?:{promptTokenCount?:number;candidatesTokenCount?:number}};
  const answer=result.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
  if(!answer)throw new AppError('ai_empty_response',503);
  const inputTokens=result.usageMetadata?.promptTokenCount||0,outputTokens=result.usageMetadata?.candidatesTokenCount||0;
  const actual=inputTokens&&outputTokens?(inputTokens*0.30+outputTokens*2.50)/1_000_000:REQUEST_RESERVE;
  await dataRequest('/rest/v1/rpc/cg_ai_settle','POST',{},{
   p_month:monthKey,p_reserved:REQUEST_RESERVE,p_actual:actual
  });
  reserved=false;
  await insert('cg_ai_messages',[{conversation_id:conversationId,user_id:user.id,role:'assistant',content:answer,model:MODEL,input_tokens:inputTokens,output_tokens:outputTokens,cost_usd:actual}]);
  await dataRequest('/rest/v1/cg_ai_conversations','PATCH',{id:'eq.'+conversationId,user_id:'eq.'+user.id},{updated_at:new Date().toISOString()});
  const budget=await list<{spent_usd:number}>('cg_ai_budget',{month_key:'eq.'+monthKey},'spent_usd');
  return Response.json({answer,conversationId,usage:{inputTokens,outputTokens,estimatedCostUsd:actual,monthToDateUsd:Number(budget[0]?.spent_usd||0),monthlyLimitUsd:MONTHLY_LIMIT}},{
   headers:{'Cache-Control':'no-store'}
  });
 }catch(e){
  if(reserved&&monthKey)try{await dataRequest('/rest/v1/rpc/cg_ai_settle','POST',{},{
   p_month:monthKey,p_reserved:REQUEST_RESERVE,p_actual:0
  })}catch{}
  return handleError(e);
 }
}
