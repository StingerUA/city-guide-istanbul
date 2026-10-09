import CityGuide from '../city-guide';
import {requireChatGPTUser} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export default async function TouristPage(){
  await requireChatGPTUser('/tourist');
  return <CityGuide surface="tourist"/>;
}
