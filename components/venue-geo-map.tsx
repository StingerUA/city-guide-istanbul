'use client';

import React,{useEffect,useMemo,useRef,useState} from 'react';
import type {VenueLocation,Lang} from '@/lib/model';

const TILE=256;
const MAX_LAT=85.05112878;
function clampLat(lat:number){return Math.max(-MAX_LAT,Math.min(MAX_LAT,lat))}
function world(lat:number,lng:number,zoom:number){
 const scale=TILE*Math.pow(2,zoom);
 const phi=clampLat(lat)*Math.PI/180;
 return {x:(lng+180)/360*scale,y:(1-Math.log(Math.tan(phi)+1/Math.cos(phi))/Math.PI)/2*scale};
}
function coordinate(x:number,y:number,zoom:number){
 const scale=TILE*Math.pow(2,zoom);
 const lng=((x/scale*360+180)%360+360)%360-180;
 const phi=Math.atan(Math.sinh(Math.PI*(1-2*y/scale)));
 return {lat:clampLat(phi*180/Math.PI),lng};
}
type GeoMapProps={
 points:VenueLocation[];
 activeId?:string;
 onPick?:(coordinates:{lat:number;lng:number})=>void;
 onSelect?:(id:string)=>void;
 height?:number;
 lang?:Lang;
};
export default function VenueGeoMap({points,activeId,onPick,onSelect,height=320,lang='tr'}:GeoMapProps){
 const ref=useRef<HTMLDivElement>(null);
 const drag=useRef<{x:number;y:number;origin:{lat:number;lng:number};moved:boolean}|null>(null);
 const [size,setSize]=useState({width:600,height});
 const [zoom,setZoom]=useState(14);
 const [center,setCenter]=useState(()=>({lat:points[0]?.lat??41.0082,lng:points[0]?.lng??28.9784}));
 const active=points.find(p=>p.id===activeId);
 const previousActive=useRef(activeId);
 const signature=points.map(p=>p.id+':'+p.lat.toFixed(5)+':'+p.lng.toFixed(5)).join('|');
 useEffect(()=>{
   if(onPick||points.length<2||size.width<100)return;
   for(let candidate=16;candidate>=4;candidate--){
     const coords=points.map(p=>world(p.lat,p.lng,candidate));
     const left=Math.min(...coords.map(p=>p.x)),right=Math.max(...coords.map(p=>p.x));
     const top=Math.min(...coords.map(p=>p.y)),bottom=Math.max(...coords.map(p=>p.y));
     if((right-left<size.width-90&&bottom-top<size.height-90)||candidate===4){
       setZoom(candidate);
       setCenter(coordinate((left+right)/2,(top+bottom)/2,candidate));
       break;
     }
   }
 // signature captures values even if the array identity changes every render.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[signature,size.width,size.height,!!onPick]);
 useEffect(()=>{
   const obs=new ResizeObserver(entries=>{
     if(entries[0])setSize({width:entries[0].contentRect.width,height:entries[0].contentRect.height});
   });
   if(ref.current)obs.observe(ref.current);
   return ()=>obs.disconnect();
 },[]);
 useEffect(()=>{if(active&&previousActive.current!==activeId)setCenter({lat:active.lat,lng:active.lng});previousActive.current=activeId},[activeId,active?.lat,active?.lng]);
 const tiles=useMemo(()=>{
   const origin=world(center.lat,center.lng,zoom);
   const left=origin.x-size.width/2,top=origin.y-size.height/2;
   const xMin=Math.floor(left/TILE),yMin=Math.floor(top/TILE);
   const maxY=Math.pow(2,zoom)-1;
   const rows=Math.ceil(size.height/TILE)+2,cols=Math.ceil(size.width/TILE)+2;
   const items:{key:string;url:string;left:number;top:number}[]=[];
   for(let y=yMin;y<yMin+rows;y++){
     if(y<0||y>maxY)continue;
     for(let x=xMin;x<xMin+cols;x++){
       const normalized=((x%(maxY+1))+(maxY+1))%(maxY+1);
       items.push({key:x+':'+y,url:`https://tile.openstreetmap.org/${zoom}/${normalized}/${y}.png`,
         left:x*TILE-left,top:y*TILE-top});
     }
   }
   return items;
 },[center,zoom,size]);
 const pins=useMemo(()=>{
   const origin=world(center.lat,center.lng,zoom);
   const scale=TILE*Math.pow(2,zoom);
   return points.map(point=>{
     const p=world(point.lat,point.lng,zoom);
     const wrapped=((p.x-origin.x+scale/2)%scale+scale)%scale-scale/2;
     return {...point,x:size.width/2+wrapped,y:size.height/2+p.y-origin.y};
   }).filter(point=>point.x>-30&&point.x<size.width+30&&point.y>-30&&point.y<size.height+30);
 },[points,center,zoom,size]);
 function handleDown(e:React.PointerEvent<HTMLDivElement>){
   if(e.button!==0)return;
   drag.current={x:e.clientX,y:e.clientY,origin:center,moved:false};
   e.currentTarget.setPointerCapture(e.pointerId);
 }
 function handleMove(e:React.PointerEvent<HTMLDivElement>){
   const start=drag.current;
   if(!start)return;
   const dx=e.clientX-start.x,dy=e.clientY-start.y;
   if(Math.hypot(dx,dy)>6)start.moved=true;
   if(!start.moved)return;
   const from=world(start.origin.lat,start.origin.lng,zoom);
   setCenter(coordinate(from.x-dx,from.y-dy,zoom));
 }
 function handleUp(e:React.PointerEvent<HTMLDivElement>){
   const start=drag.current;
   drag.current=null;
   if(!start)return;
   if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
   if(start.moved||!onPick||!ref.current)return;
   const box=ref.current.getBoundingClientRect();
   const xy=world(center.lat,center.lng,zoom);
   onPick(coordinate(xy.x+e.clientX-box.left-box.width/2,
     xy.y+e.clientY-box.top-box.height/2,zoom));
 }
 return <div className="venue-geo-map">
   <div ref={ref} className={'venue-map-canvas'+(onPick?' is-editable':'')}
     style={{height,touchAction:'none'}} role="group"
     aria-label={onPick?(lang==='tr'?'Haritadan konum seç':lang==='ru'?'Выберите место на карте':'Select a location on the map'):(lang==='tr'?'İşletme konumları':lang==='ru'?'Точки заведения':'Venue locations')}
     onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={handleUp}
     onPointerCancel={()=>{drag.current=null}}>
     {tiles.map(tile=><img key={tile.key} src={tile.url} alt="" draggable={false}
       width={TILE} height={TILE} style={{position:'absolute',left:tile.left,top:tile.top,pointerEvents:'none'}}/>)}
     {pins.map((point,i)=><button type="button" key={point.id}
       className={'venue-map-pin'+(point.id===activeId?' active':'')}
       style={{left:point.x,top:point.y}}
       onPointerDown={e=>e.stopPropagation()}
       onClick={e=>{e.stopPropagation();onSelect?.(point.id)}}
       title={point.label} aria-label={point.label}>
       {i+1}
     </button>)}
     <div className="venue-map-zoom" onPointerDown={e=>e.stopPropagation()}>
       <button type="button" title="Zoom in" aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(18,z+1))}>+</button>
       <button type="button" title="Zoom out" aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(4,z-1))}>−</button>
     </div>
     <span className="venue-map-attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></span>
   </div>
   {onPick&&<p className="venue-map-help">{lang==='tr'?'Haritaya dokunun, sürükleyin veya + / − ile yakınlaştırın.':lang==='ru'?'Нажмите на карту, перемещайте её или используйте + / − для масштаба.':'Click the map to select a point. Drag or use + / − to zoom.'}</p>}
 </div>;
}
