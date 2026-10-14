'use client';
import {useState} from 'react';
import type {Venue,VenueLocation,Lang} from '@/lib/model';
import {venueLocations} from '@/lib/model';
import VenueGeoMap from './venue-geo-map';
const words={
 tr:{branches:'Şubeler',directions:'Yol tarifi'},
 ru:{branches:'Филиалы',directions:'Маршрут'},
 en:{branches:'Locations',directions:'Directions'}
};
export function VenueLocationsView({venue,lang}: {venue:Venue;lang:Lang}){
 const points=venueLocations(venue);
 const [activeId,setActiveId]=useState(points[0].id);
 const selected=points.find(p=>p.id===activeId)||points[0];
 return <div className="venue-visitor-locations">
   <VenueGeoMap points={points} activeId={selected.id} onSelect={setActiveId} height={280}/>
   <h4>{words[lang].branches} ({points.length})</h4>
   <div className="venue-visitor-branches">
     {points.map((p,i)=><button key={p.id} type="button"
       className={'venue-visitor-branch'+(p.id===selected.id?' active':'')}
       onClick={()=>setActiveId(p.id)}>
       <b>{i+1}. {p.label}</b><small>{p.address||p.lat.toFixed(5)+', '+p.lng.toFixed(5)}</small>
     </button>)}
   </div>
   <a className="button" href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
      target="_blank" rel="noreferrer">{words[lang].directions} ↗</a>
 </div>;
}
export function VenueCatalogMap({venues,selected,onPlace}:{
 venues:Venue[];selected:Venue;onPlace:(venue:Venue)=>void
}){
 const pins=venues.flatMap(venue=>venueLocations(venue).map(point=>({
   ...point,id:venue.id+'::'+point.id,label:venue.name+' · '+point.label
 })));
 const first=venueLocations(selected)[0];
 const active=selected.id+'::'+first.id;
 return <VenueGeoMap points={pins} activeId={active}
   onSelect={id=>{
     const venue=venues.find(v=>id.startsWith(v.id+'::'));
     if(venue)onPlace(venue);
   }} height={510}/>;
}
