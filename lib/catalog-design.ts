import {searchText, type Category, type Lang} from './model';

/** The order and membership of the supplied HOME PAGE design. */
export const homeCategories: Category[] = ['shopping','restaurant','fun','nightlife','rent','beauty','history','nature','museum','pray','clinic','emergency'];
export const homePhotoFrames: Record<string, [number,number,number,number]> = {
 shopping:[31,526,151,83], restaurant:[211,526,151,83], fun:[391,526,151,83],
 nightlife:[31,679,151,83], rent:[211,679,151,83], beauty:[391,679,151,83],
 history:[31,832,151,83], nature:[211,832,151,83], museum:[391,832,151,83],
 pray:[31,986,151,83], clinic:[211,986,151,83], emergency:[391,986,151,83],
};
const homeEnglish: Record<string,string> = {shopping:'Shopping',restaurant:'Restaurant',fun:'Fun’s',nightlife:'Night Life',rent:'For Rent',beauty:'Hair Style',history:'History',nature:'Nature',museum:'Museum',pray:'Pray',clinic:'Clinic',emergency:'Emergency'};
export function categoryLabel(category:string,lang:Lang,t:(key:string)=>string){return lang==='en' ? homeEnglish[category]||t(category) : t(category)}

export type Subcategory = {id:string;en:string;tr:string;ru:string;aliases:string[]};
type Entry = [string,string,string,string,string[]?];
const entries:Partial<Record<Category,Entry[]>> = {
 shopping:[['vip','V.I.P','V.I.P','VIP',['luxury']],['mall','Mall’s','AVM','ТЦ',['mall','malls','shopping mall']],['outlet','Outlet','Outlet','Аутлет'],['historic-shop','H. Shop’s','Tarihi çarşı','Исторические лавки',['historical shop','bazaar']]],
 restaurant:[['fish','Fish','Balık','Рыба'],['steak','Steak','Et','Стейки'],['sushi','Sushi','Suşi','Суши'],['vegan','Vegan','Vegan','Веган'],['sweet','Sweet','Tatlı','Десерты'],['order','Order','Sipariş','Заказать']],
 fun:[['atv','ATV Safari','ATV Safari','Квадроциклы',['atv safari']],['kart','Go Kart','Go Kart','Картинг',['go kart','karting']],['theme-park','Theme Park','Tema parkı','Парк аттракционов'],['polygon','Polygon','Atış poligonu','Тир'],['pool','Pool','Havuz','Бассейн'],['paragliding','Paragliding','Yamaç paraşütü','Параплан'],['skiing','Skiing','Kayak','Лыжи']],
 nightlife:[['night-club','Night Club','Gece kulübü','Ночной клуб'],['arabic-dance','Arabic Dance','Oryantal','Восточные танцы'],['striptease','Striptease','Striptiz','Стриптиз'],['karaoke','Karaoke','Karaoke','Караоке'],['live-music','Live Music','Canlı müzik','Живая музыка'],['rock','Rock','Rock','Рок']],
 rent:[['car','Car','Araba','Авто',['automatic','manual','sedan']],['lux-car','Lux Car','Lüks araba','Люкс авто',['luxury car']],['yacht','Yacht','Yat','Яхта'],['helicopter','Helicopter','Helikopter','Вертолёт'],['jet','VIP Jet','VIP jet','VIP самолёт']],
 beauty:[['coiffeur','Coiffeur','Kuaför','Парикмахер',['couffer','hair salon']],['beauty-center','Beauty Center','Güzellik merkezi','Салон красоты'],['makeup','Make Up','Makyaj','Макияж',['make up']],['all-in-one','All in One','Hepsi bir arada','Всё в одном']],
 history:[['historic','Historical Areas','Tarihi yerler','Исторические места',['historical area','history']]],
 nature:[['nature','Natural Areas','Doğal alanlar','Природа',['natural area']]],
 museum:[['museum','All Museums','Müzeler','Музеи',['all museum']]],
 pray:[['mosque','Mosque','Cami','Мечеть'],['church','Church','Kilise','Церковь'],['synagogue','Synagogue','Sinagog','Синагога']],
 clinic:[['surgery','Surgery','Cerrahi','Хирургия'],['hair-transplant','Hair Transplant','Saç ekimi','Пересадка волос',['hair transport']],['tooth','Tooth','Diş','Стоматология',['dental','dentist']]],
 emergency:[['hospital','Hospital','Hastane','Больница'],['pharmacy','Pharmacy','Eczane','Аптека'],['police','Police','Polis','Полиция']],
};
export const subcategories = Object.fromEntries(Object.entries(entries).map(([key,rows])=>[key,rows.map(([id,en,tr,ru,aliases=[]])=>({id,en,tr,ru,aliases}))])) as Record<string,Subcategory[]>;
export function matchesSubcategory(value:string,subcategory:Subcategory){
 const normalize=(s:string)=>searchText(s).replace(/[^a-zа-я0-9]/g,'');
 const needle=normalize(value);
 return [subcategory.id,subcategory.en,subcategory.tr,subcategory.ru,...subcategory.aliases].some(v=>normalize(v)===needle);
}
