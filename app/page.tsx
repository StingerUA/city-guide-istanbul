import {redirect} from 'next/navigation';
import {requireChatGPTUser} from './chatgpt-auth';
import {profile} from '@/lib/server';
export const dynamic = 'force-dynamic';
export default async function Home() {
  await requireChatGPTUser('/');
  const user=await profile();
  redirect('/'+user.role);
}
