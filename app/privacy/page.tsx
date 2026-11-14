'use client';
import {useEffect,useState} from 'react';
import {CONTACT_EMAIL,OPERATOR,POLICY_UPDATED,policy,type LegalLang} from '@/lib/legal';

export default function PrivacyPage(){
 // По умолчанию английский: так страницу видят проверяющие Google Play и поисковые роботы без JavaScript.
 const[lang,setLang]=useState<LegalLang>('en');
 useEffect(()=>{
  try{
   const q=new URLSearchParams(location.search).get('lang');
   const saved=localStorage.getItem('city-guide-language')||localStorage.getItem('city-guide-signin-language');
   const pick=[q,saved].find(v=>v==='ru'||v==='tr'||v==='en');
   if(pick)setLang(pick as LegalLang);
  }catch{}
 },[]);
 const t=policy[lang];
 const fill=(s:string)=>s.replaceAll('{email}',CONTACT_EMAIL).replaceAll('{operator}',OPERATOR);
 function change(next:LegalLang){setLang(next);try{localStorage.setItem('city-guide-language',next)}catch{}}
 return <main style={{minHeight:'100vh',padding:'24px 16px',background:'#f9f7fa'}}>
  <article lang={lang} style={{background:'white',padding:'28px 24px',borderRadius:20,maxWidth:760,margin:'0 auto',display:'grid',gap:16,lineHeight:1.55}}>
   <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20}}>
    <b>City Guide</b>
    <select aria-label="Language" value={lang} onChange={e=>change(e.target.value as LegalLang)}>
     <option value="en">English</option><option value="ru">Русский</option><option value="tr">Türkçe</option>
    </select>
   </header>
   <h1 style={{fontSize:28,fontWeight:700}}>{t.title}</h1>
   <p style={{color:'#666',fontSize:14}}>{t.updated}: {POLICY_UPDATED}</p>
   {t.sections.map(section=><section key={section.h} style={{display:'grid',gap:8}}>
    <h2 style={{fontSize:19,fontWeight:700,marginTop:8}}>{section.h}</h2>
    {section.p?.map(p=><p key={p}>{fill(p)}</p>)}
    {section.ul&&<ul style={{paddingLeft:22,display:'grid',gap:6,listStyle:'disc'}}>{section.ul.map(li=><li key={li}>{fill(li)}</li>)}</ul>}
   </section>)}
   <footer style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:12}}>
    <a href={'/delete-account?lang='+lang} style={{color:'#c93270',textDecoration:'underline'}}>{t.deleteLink}</a>
    <a href="/tourist" style={{color:'#c93270',textDecoration:'underline'}}>{t.back}</a>
   </footer>
  </article>
 </main>;
}
