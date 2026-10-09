export type Lang='ru'|'tr'|'en';
export type Localized=Record<Lang,string>;
export const locale={ru:'ru-RU',tr:'tr-TR',en:'en-GB'};
export const categories=['restaurant','shopping','fun','nightlife','rent','beauty','history','nature','museum','pray','clinic','emergency','hotel'] as const;
export type Category=typeof categories[number];
export type Service={id:string;name:Localized;price:number;duration:number;image:string};
export type Venue={id:string;name:string;category:Category;subcategory:string;city:string;district:string;address:string;lat:number;lng:number;description:Localized;image:string;gallery:string[];phone:string;website:string;open:string;close:string;price:number;currency:'TRY'|'USD'|'EUR';bookingType:'table'|'rental'|'appointment'|'ticket'|'stay'|'none';capacity:number;alcohol:boolean;status:'draft'|'pending'|'published'|'archived';isDemo:boolean;ownerId:string;updatedAt:string;version:number;discount:number;services:Service[]};
export type Surface='admin'|'partner'|'tourist';
export type Profile={id:string;name:string;email:string;phone:string;language:Lang;homeAddress:string;role:'admin'|'partner'|'tourist'};
export type Booking={id:string;venueId:string;venueName:string;userId:string;name:string;phone:string;date:string;time:string;endDate:string;guests:number;status:'pending'|'confirmed'|'cancelled'|'completed';total:number;currency:string;payment:'onsite'|'demo';isDemo:boolean;note:string;createdAt:string};
export type Review={id:string;venueId:string;bookingId:string;userId:string;author:string;rating:number;text:string;createdAt:string;isDemo:boolean;status?:'published'|'hidden';reply?:string;version?:number};
export type Feedback={id:string;userId:string;author:string;kind:'app'|'help';rating:number;text:string;createdAt:string;updatedAt:string;status:'open'|'in_progress'|'resolved';reply:string;version:number};
export type AppState={user:Profile|null;venues:Venue[];bookings:Booking[];favorites:string[];reviews:Review[];mode:'live'|'preview';revision?:string;users?:Profile[];feedback?:Feedback[]};
export const demoDescription:Localized={ru:'Демонстрационная карточка City Guide. Фото из предоставленных макетов. Цены, расписание и условия приведены только для показа.',tr:'City Guide örnek kaydı. Görseller sağlanan tasarımlardan alınmıştır. Fiyatlar, saatler ve koşullar yalnızca gösterim amaçlıdır.',en:'City Guide sample listing. Photos come from the supplied designs. Prices, hours and terms are illustrative only.'};
export const demoVenues:Venue[]=[
['demo-marmara','Marmara Balık','restaurant','Fish','Karaköy','restaurant','table',0,41.0247,28.9755],
['demo-istinye','İstinye Park','shopping','Mall','Sarıyer','shopping','none',0,41.1103,29.0325],
['demo-atv','Forest ATV Experience','fun','ATV Safari','Kemerburgaz','adventure','ticket',1500,41.164,28.901],
['demo-rent','B.C. Rent a Car','rent','Automatic','Arnavutköy','cars','rental',2400,41.181,28.738],
['demo-salon','Beyoğlu Beauty Studio','beauty','Hair Salon','Beyoğlu','salon','appointment',850,41.031,28.977],
['demo-clinic','City Dental Studio','clinic','Dental','Levent','clinic','appointment',0,41.081,29.01],
['demo-museum','Adalar Müzesi','museum','Museum','Büyükada','museum','ticket',200,40.850,29.126],
['demo-mosque','İstanbul · Mimari Rota','pray','Mosque','Beşiktaş','istanbul','none',0,41.042,29.006],
['demo-hospital','İstanbul Medical Point','emergency','Hospital','Nişantaşı','hospital','none',0,41.05,28.993]
].map((v,i)=>({id:String(v[0]),name:String(v[1]),category:v[2] as Category,subcategory:String(v[3]),city:'İstanbul',district:String(v[4]),address:`${v[4]}, İstanbul`,lat:Number(v[8]),lng:Number(v[9]),description:demoDescription,image:`/images/${v[5]}.webp`,gallery:[`/images/${v[5]}.webp`],phone:'',website:'',open:'09:00',close:'22:00',price:Number(v[7]),currency:'TRY',bookingType:v[6] as Venue['bookingType'],capacity:v[6]==='rental'?1:12,alcohol:i===0,status:'published',isDemo:true,ownerId:'demo',updatedAt:'2026-10-08T19:00:00.000Z',version:1,discount:i===0?10:0,services:i===0?[{id:'fish',name:{ru:'Рыба на гриле',tr:'Izgara balık',en:'Grilled fish'},price:750,duration:60,image:'/images/restaurant.webp'},{id:'seafood',name:{ru:'Морепродукты',tr:'Deniz ürünleri',en:'Seafood selection'},price:1100,duration:60,image:'/images/seafood.webp'}]:[]}));
export function translated(v:Localized|undefined,l:Lang){return v?.[l]||v?.tr||v?.en||v?.ru||''}
export function currency(v:number,c:string,l:Lang){return new Intl.NumberFormat(locale[l],{style:'currency',currency:c,minimumFractionDigits:0,maximumFractionDigits:2}).format(v)}
export function searchText(value:string){return value.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('tr').replaceAll('ı','i').trim()}
export function priceUnit(type:Venue['bookingType']){return type==='rental'?'perDay':type==='stay'?'perNight':type==='ticket'?'perPerson':type==='appointment'?'perAppointment':'perReservation'}
export function istanbulDate(date:Date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
