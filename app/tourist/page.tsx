import CityGuide from '../city-guide';
import {requireSupabaseUser} from '@/lib/supabase/auth';
export const dynamic='force-dynamic';
export default async function TouristPage(){
  await requireSupabaseUser('/tourist');
  return <CityGuide surface="tourist"/>;
}
