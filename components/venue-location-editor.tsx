'use client';
import {useState,type Dispatch,type SetStateAction} from 'react';
import type {Venue,VenueLocation,Lang} from '@/lib/model';
import {venueLocations} from '@/lib/model';
import VenueGeoMap from './venue-geo-map';

type Props={value:Venue;onChange:Dispatch<SetStateAction<Venue>>;lang:Lang};
const labels={
 tr:{title:'Harita ve şubeler',subtitle:'Haritaya dokunarak seçili şubenin yerini belirleyin. Tüm şubeler aynı açıklamayı ve fotoğrafları paylaşır.',add:'Şube ekle',remove:'Şubeyi sil',name:'Şube adı',address:'Şube adresi',branch:'Şube',coordinates:'Koordinatlar',limit:'En fazla 50 şube eklenebilir.'},
 ru:{title:'Карта и филиалы',subtitle:'Нажмите на карту, чтобы поставить выбранный филиал. Все точки используют общее описание и фотогалерею.',add:'Добавить точку',remove:'Удалить точку',name:'Название филиала',address:'Адрес филиала',branch:'Филиал',coordinates:'Координаты',limit:'Максимум 50 точек.'},
 en:{title:'Map and branches',subtitle:'Click the map to position the selected branch. All branches share the description and photo gallery.',add:'Add branch',remove:'Remove branch',name:'Branch name',address:'Branch address',branch:'Branch',coordinates:'Coordinates',limit:'Up to 50 locations.'}
};
export default function VenueLocationEditor({value,onChange,lang}:Props){
 const t=labels[lang];
 const points=venueLocations(value);
 const [active,setActive]=useState<string|null>(null);
 const selected=points.find(p=>p.id===active)||points[0];
 function apply(next:VenueLocation[]){
   if(!next.length)return;
   onChange(previous=>({
     ...previous,locations:next,
     // The first branch remains the legacy/default coordinate and address.
     lat:next[0].lat,lng:next[0].lng,address:next[0].address
   }));
 }
 function updatePoint(id:string,changes:Partial<VenueLocation>){
   apply(points.map(p=>p.id===id?{...p,...changes}:p));
 }
 function add(){
   if(points.length>=50)return;
   const selectedPoint=selected||points[0];
   const p:VenueLocation={
     id:crypto.randomUUID(),label:t.branch+' '+(points.length+1),
     address:'',lat:selectedPoint.lat+0.002,lng:selectedPoint.lng+0.002
   };
   apply([...points,p]);setActive(p.id);
 }
 function remove(){
   if(points.length<=1)return;
   const next=points.filter(p=>p.id!==selected.id);
   setActive(next[0].id);apply(next);
 }
 return <section className="venue-branch-editor full">
   <h3>{t.title} <span className="venue-branch-count">{points.length}/50</span></h3>
   <p className="venue-branch-hint">{t.subtitle}</p>
   <div className="venue-branch-list">
     {points.map((p,i)=><button className={'venue-branch-tab'+(p.id===selected.id?' active':'')}
       type="button" key={p.id} onClick={()=>setActive(p.id)}>
       <span>{i+1}</span>{p.label}
     </button>)}
   </div>
   <div className="venue-branch-actions">
     <button type="button" className="button" disabled={points.length>=50} onClick={add}>+ {t.add}</button>
     {points.length>1&&<button type="button" className="button" onClick={remove}>{t.remove}</button>}
   </div>
   <VenueGeoMap points={points} activeId={selected.id}
      onPick={coords=>updatePoint(selected.id,coords)} onSelect={setActive} lang={lang} height={330}/>
   <div className="venue-branch-fields">
     <label><span>{t.name}</span>
       <input required maxLength={100} value={selected.label}
         onChange={e=>updatePoint(selected.id,{label:e.target.value})}/>
     </label>
     <label><span>{t.address}</span>
       <input maxLength={500} value={selected.address}
         onChange={e=>updatePoint(selected.id,{address:e.target.value})}/>
     </label>
   </div>
   <div className="venue-branch-coordinates">{t.coordinates}: {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}</div>
   <p className="venue-branch-hint">{t.limit}</p>
 </section>;
}
