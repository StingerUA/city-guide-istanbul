'use client';
import {useState} from 'react';
import type {Venue} from '@/lib/model';

export default function VenueGallery({venue}: {venue:Venue}){
 const images=[...new Set([venue.image,...(venue.gallery||[])].filter(Boolean))];
 const [current,setCurrent]=useState(0);
 const index=Math.min(current,Math.max(0,images.length-1));
 if(!images.length)return <div className="detail-photo venue-photo-placeholder">City Guide</div>;
 function move(direction:number){setCurrent(old=>(old+direction+images.length)%images.length)}
 return <div className="venue-gallery-view">
   <div className="venue-gallery-main">
     <img src={images[index]} alt={venue.name+' · '+(index+1)} loading="eager"/>
     {images.length>1&&<>
       <button type="button" onClick={()=>move(-1)} className="venue-gallery-previous" aria-label="Previous photo">‹</button>
       <button type="button" onClick={()=>move(1)} className="venue-gallery-next" aria-label="Next photo">›</button>
       <span className="venue-gallery-counter">{index+1} / {images.length}</span>
     </>}
   </div>
   {images.length>1&&<div className="venue-gallery-thumbnails">
     {images.map((url,i)=><button key={url} type="button" onClick={()=>setCurrent(i)}
       className={index===i?'active':''} aria-label={'Photo '+(i+1)} aria-pressed={index===i}>
       <img src={url} alt="" loading="lazy"/>
     </button>)}
   </div>}
 </div>;
}
