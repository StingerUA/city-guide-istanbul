import {useId} from 'react';
import {homePhotoFrames} from '@/lib/catalog-design';

/** Reuse the reference photographs without recreating or generating substitutes. */
export function CategoryPhoto({category}:{category:string}){
 const frame=homePhotoFrames[category];
 return frame ? <svg className="reference-category-photo" viewBox={frame.join(' ')} preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="/images/city-guide-reference.jpg" width="1536" height="1241"/></svg> : null;
}
export function Cloudscape(){return <svg className="weather-cloudscape" viewBox="47 335 285 73" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="/images/city-guide-reference.jpg" width="1536" height="1241"/></svg>}
export function WeatherArt({kind='sun'}:{kind?:'sun'|'cloud'|'rain'}){
 const id=useId();
 return <svg className="weather-art" viewBox="0 0 140 115" aria-hidden="true"><defs><radialGradient id={id} cx="35%" cy="25%" r="75%"><stop stopColor="#ffeaa4"/><stop offset=".5" stopColor="#ffd145"/><stop offset="1" stopColor="#ffb009"/></radialGradient></defs>{kind!=='rain'&&<circle cx="78" cy="52" r="45" fill={`url(#${id})`}/>}<path d="M45 97H9c-16-2-9-22 3-19 0-30 40-31 42-4 23-9 31 24 11 23Z" fill="#fff"/>{kind!=='sun'&&<path d="M114 69H50c-27 0-28-31-5-33 1-36 54-37 61-4 35-8 42 37 8 37Z" fill="#f4f8fa"/>}{kind==='rain'&&<g stroke="#65b7df" strokeWidth="5" strokeLinecap="round"><path d="m67 85-5 9m23-9-5 9m23-9-5 9"/></g>}</svg>;
}
export function NavigationArt({kind}:{kind:'home'|'account'|'gift'|'dice'|'pin'|'exchange'}){
 const id=useId();
 return <svg viewBox="0 0 64 64" className={'navigation-art art-'+kind} aria-hidden="true"><defs><linearGradient id={id} x1="0" y1="0" x2=".3" y2="1"><stop stopColor="var(--cg-deep,#c83e78)"/><stop offset="1" stopColor="var(--cg-pale,#f7b6d1)"/></linearGradient></defs><g fill={`url(#${id})`}>
  {kind==='home'&&<path d="M5 29 32 4l27 25v30H39V39H25v20H5Z"/>}
  {kind==='account'&&<><circle cx="32" cy="17" r="12"/><path d="M11 59v-7c0-28 42-28 42 0v7Z"/></>}
  {kind==='gift'&&<><path d="M7 29h22v30H9V35H7Zm28 0h22v6h-2v24H35ZM4 20h25v11H4Zm31 0h25v11H35Z"/><path d="M31 21C7 24 5 0 21 4c7 1 10 13 11 17m1 0C57 24 59 0 43 4c-7 1-10 13-11 17" fill="none" stroke={`url(#${id})`} strokeWidth="4"/></>}
  {kind==='dice'&&<><path d="m32 3 26 14-26 15L6 17Zm-27 19 24 14v26L5 47Zm30 14 24-14v25L35 62Z"/><g fill="white"><ellipse cx="32" cy="17" rx="3" ry="2"/><ellipse cx="13" cy="34" rx="2" ry="3"/><ellipse cx="22" cy="49" rx="2" ry="3"/><ellipse cx="42" cy="41" rx="2" ry="3"/><ellipse cx="52" cy="32" rx="2" ry="3"/><ellipse cx="52" cy="48" rx="2" ry="3"/></g></>}
  {kind==='pin'&&<><path d="M32 61C24 51 7 35 7 24a25 25 0 0 1 50 0C57 35 40 51 32 61Z"/><path d="M32 47c-7-9-17-19-17-25a17 17 0 1 1 34 0c0 7-10 17-17 25Z" fill="none" stroke="white" strokeOpacity=".65" strokeWidth="3"/><path d="m21 24 11-10 11 10v12h-8v-9h-6v9h-8Z" fill="white" fillOpacity=".8"/></>}
  {kind==='exchange'&&<><circle cx="32" cy="32" r="29"/><g fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M18 25c3-14 24-14 29-2m-7-2 8 3 1-9M46 40c-6 13-25 11-29-1m-1 9-1-11 10 3M39 24c-15-7-20 9-6 9 13 0 7 16-7 8M33 18v29"/></g></>}
 </g></svg>;
}
