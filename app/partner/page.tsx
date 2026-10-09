import {redirect} from 'next/navigation';
import CityGuide from '../city-guide';
import {requireChatGPTUser} from '../chatgpt-auth';
import {profile} from '@/lib/server';
export const dynamic='force-dynamic';
export default async function PartnerPage(){
  await requireChatGPTUser('/partner');
  const user=await profile();
  if(user.role==='tourist')redirect('/tourist');
  return <CityGuide surface="partner"/>;
}
