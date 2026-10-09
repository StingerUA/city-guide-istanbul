import {redirect} from 'next/navigation';
import CityGuide from '../city-guide';
import {requireChatGPTUser} from '../chatgpt-auth';
import {profile} from '@/lib/server';
export const dynamic='force-dynamic';
export default async function AdminPage(){
  await requireChatGPTUser('/admin');
  const user=await profile();
  if(user.role!=='admin')redirect('/'+user.role);
  return <CityGuide surface="admin"/>;
}
