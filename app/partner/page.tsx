import {redirect} from 'next/navigation';
import CityGuide from '../city-guide';
import {requireSupabaseUser} from '@/lib/supabase/auth';
import {profile} from '@/lib/server';
export const dynamic='force-dynamic';
export default async function PartnerPage(){
  await requireSupabaseUser('/partner');
  const user=await profile();
  if(user.role==='tourist')redirect('/tourist');
  return <CityGuide surface="partner"/>;
}
