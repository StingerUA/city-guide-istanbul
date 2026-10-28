'use client';
import {useEffect,useState,type FormEvent} from 'react';
const copy={
 tr:{title:'Hesap güvenliği',intro:'Yönetici ve iş ortağı hesapları için iki adımlı doğrulama gereklidir.',setup:'Doğrulayıcı uygulamayı bağla',scan:'QR kodunu doğrulayıcı uygulamanızla tarayın veya anahtarı elle girin. Bu anahtarı paylaşmayın.',code:'6 haneli doğrulama kodu',verify:'Doğrula ve devam et',wait:'Lütfen bekleyin…',error:'Doğrulama tamamlanamadı. Kodu kontrol edip tekrar deneyin.',limit:'Çok fazla deneme. Bir dakika sonra tekrar deneyin.',lost:'Telefonunuza erişiminiz yoksa hesap kurtarma için proje yöneticisine başvurun.',done:'İki adımlı doğrulama etkin.',back:'Devam et',logout:'Çıkış yap'},
 ru:{title:'Безопасность аккаунта',intro:'Для администраторов и партнёров требуется двухэтапная проверка.',setup:'Подключить приложение-аутентификатор',scan:'Отсканируйте QR-код приложением-аутентификатором или введите ключ вручную. Никому не передавайте этот ключ.',code:'Код из 6 цифр',verify:'Подтвердить и продолжить',wait:'Подождите…',error:'Не удалось подтвердить код. Проверьте его и повторите попытку.',limit:'Слишком много попыток. Попробуйте через минуту.',lost:'Если телефон недоступен, обратитесь к администратору проекта для восстановления доступа.',done:'Двухэтапная проверка включена.',back:'Продолжить',logout:'Выйти'},
 en:{title:'Account security',intro:'Administrators and partners must use two-step verification.',setup:'Connect an authenticator app',scan:'Scan the QR code with your authenticator or enter the key manually. Never share this key.',code:'6-digit verification code',verify:'Verify and continue',wait:'Please wait…',error:'Verification failed. Check your code and try again.',limit:'Too many attempts. Try again in one minute.',lost:'If you cannot access your phone, contact the project administrator for account recovery.',done:'Two-step verification is enabled.',back:'Continue',logout:'Sign out'}
};
export default function SecurityPage(){
 const[lang,setLang]=useState<'tr'|'ru'|'en'>('tr');
 const[factor,setFactor]=useState('');const[setup,setSetup]=useState<{qr:string;secret:string}|null>(null);
 const[ready,setReady]=useState(false);const[done,setDone]=useState(false);const[busy,setBusy]=useState(false);const[error,setError]=useState('');
 const t=copy[lang];
 function next(){const v=new URLSearchParams(location.search).get('return_to');return v&&['/admin','/partner','/tourist'].includes(v)?v:'/tourist'}
 useEffect(()=>{
  try{const l=localStorage.getItem('city-guide-language')||localStorage.getItem('city-guide-signin-language');if(l==='ru'||l==='en'||l==='tr')setLang(l)}catch{}
  fetch('/api/auth/mfa',{cache:'no-store'}).then(async r=>{
   if(r.status===401){location.assign('/signin?return_to='+encodeURIComponent(next()));return}
   const d=await r.json() as {error?:string;factors:{id:string}[];aal:string;id:string;qr:string;secret:string;next:string};if(!r.ok)throw new Error(d.error);
   setFactor(d.factors[0]?.id||'');setDone(d.aal==='aal2');setReady(true);
  }).catch(()=>setError('failed'));
 },[]);
 async function enroll(){setBusy(true);setError('');try{
  const r=await fetch('/api/auth/mfa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'enroll'})});
  const d=await r.json() as {error?:string;factors:{id:string}[];aal:string;id:string;qr:string;secret:string;next:string};if(!r.ok)throw new Error(d.error);
  setFactor(d.id);setSetup({qr:d.qr,secret:d.secret});
 }catch(e){setError(e instanceof Error?e.message:'failed')}finally{setBusy(false)}}
 async function verify(e:FormEvent<HTMLFormElement>){e.preventDefault();const code=new FormData(e.currentTarget).get('code');setBusy(true);setError('');try{
  const r=await fetch('/api/auth/mfa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify',factorId:factor,code,returnTo:next()})});
  const d=await r.json() as {error?:string;factors:{id:string}[];aal:string;id:string;qr:string;secret:string;next:string};if(!r.ok)throw new Error(d.error);setSetup(null);location.assign(d.next);
 }catch(e){setError(e instanceof Error?e.message:'failed')}finally{setBusy(false)}}
 async function logout(){await fetch('/api/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'signout'})});location.assign('/signin')}
 const button={padding:13,borderRadius:9,background:'#c93270',color:'#fff',cursor:'pointer',width:'100%'};
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f9f7fa'}}><section lang={lang} style={{background:'white',padding:28,borderRadius:20,maxWidth:440,width:'100%',display:'grid',gap:18}}>
  <header style={{display:'flex',justifyContent:'space-between',gap:20}}><b>City Guide</b><select aria-label="Language" value={lang} onChange={e=>setLang(e.target.value as typeof lang)}><option value="tr">Türkçe</option><option value="ru">Русский</option><option value="en">English</option></select></header>
  <h1 style={{fontSize:26,fontWeight:700}}>{t.title}</h1><p>{done?t.done:t.intro}</p>
  {!ready&&!error&&<p>{t.wait}</p>}
  {ready&&!done&&!factor&&<button style={button} disabled={busy} onClick={enroll}>{busy?t.wait:t.setup}</button>}
  {setup&&<><p>{t.scan}</p><img alt="Authenticator QR" width={240} height={240} style={{margin:'auto'}} src={setup.qr.startsWith('data:image/svg+xml')?setup.qr:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(setup.qr)}/><code style={{overflowWrap:'anywhere',fontSize:14}}>{setup.secret}</code></>}
  {factor&&!done&&<form onSubmit={verify} style={{display:'grid',gap:14}}><label>{t.code}<input name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus style={{display:'block',width:'100%',padding:12,border:'1px solid #ddd',borderRadius:8,marginTop:8}}/></label><button style={button} disabled={busy}>{busy?t.wait:t.verify}</button></form>}
  {done&&<button style={button} onClick={()=>location.assign(next())}>{t.back}</button>}
  {error&&<p role="alert" style={{color:'#a20b40'}}>{error==='rate_limited'?t.limit:t.error}</p>}
  <p style={{fontSize:13,color:'#666'}}>{t.lost}</p><button onClick={logout} style={{textDecoration:'underline',cursor:'pointer'}}>{t.logout}</button>
 </section></main>;
}
