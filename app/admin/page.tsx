import {redirect} from 'next/navigation';
import CityGuide from '../city-guide';
import {requireSupabaseUser} from '@/lib/supabase/auth';
import {profile} from '@/lib/server';
export const dynamic='force-dynamic';
export default async function AdminPage(){
  await requireSupabaseUser('/admin');
  const user=await profile();
  if(user.role!=='admin')redirect('/'+user.role);
  return <CityGuide surface="admin"/>;
}
