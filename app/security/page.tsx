'use client';
import {useEffect,useState,type FormEvent} from 'react';
const copy={
 tr:{title:'Hesap güvenliği',intro:'İki faktörlü kimlik doğrulama, yönetici ve iş ortakları dahil herkes için varsayılan olarak kapalıdır. İsterseniz açabilirsiniz.',off:'İki faktörlü kimlik doğrulama kapalı.',on:'İki faktörlü kimlik doğrulama açık.',challenge:'Girişinizi tamamlamak için doğrulayıcı uygulamanızdaki kodu girin.',setup:'İki faktörlü doğrulamayı aç',scan:'QR kodunu doğrulayıcı uygulamanızla tarayın veya anahtarı elle girin. Bu anahtarı paylaşmayın. Özellik, ilk kodu doğruladığınızda açılır.',code:'6 haneli doğrulama kodu',verify:'Doğrula ve devam et',wait:'Lütfen bekleyin...',error:'İşlem tamamlanamadı. Kodu kontrol edip tekrar deneyin.',limit:'Çok fazla deneme. Bir dakika sonra tekrar deneyin.',lost:'Telefonunuza erişiminiz yoksa hesap kurtarma için proje yöneticisine başvurun.',back:'Geri dön',logout:'Çıkış yap',disable:'İki faktörlü doğrulamayı kapat',disableHint:'Kapatmak için yeni bir doğrulama kodu girin. Sonrasında tekrar giriş yapmanız gerekir.',confirmDisable:'Kodu doğrula ve kapat',cancel:'Vazgeç'},
 ru:{title:'Безопасность аккаунта',intro:'Двухфакторная аутентификация выключена по умолчанию у всех, включая администратора и партнёров. Её можно включить по желанию.',off:'Двухфакторная аутентификация выключена.',on:'Двухфакторная аутентификация включена.',challenge:'Введите код из приложения-аутентификатора, чтобы завершить вход.',setup:'Включить двухфакторную аутентификацию',scan:'Отсканируйте QR-код приложением-аутентификатором или введите ключ вручную. Никому не передавайте этот ключ. Защита включится после подтверждения первого кода.',code:'Код из 6 цифр',verify:'Подтвердить и продолжить',wait:'Подождите...',error:'Не удалось выполнить действие. Проверьте код и повторите попытку.',limit:'Слишком много попыток. Попробуйте через минуту.',lost:'Если телефон недоступен, обратитесь к администратору проекта для восстановления доступа.',back:'Назад',logout:'Выйти',disable:'Отключить двухфакторную аутентификацию',disableHint:'Для отключения введите свежий код подтверждения. После этого потребуется войти снова.',confirmDisable:'Подтвердить код и отключить',cancel:'Отмена'},
 en:{title:'Account security',intro:'Two-factor authentication is off by default for everyone, including administrators and partners. You can enable it if you wish.',off:'Two-factor authentication is off.',on:'Two-factor authentication is on.',challenge:'Enter the code from your authenticator app to complete sign-in.',setup:'Enable two-factor authentication',scan:'Scan the QR code with your authenticator or enter the key manually. Never share this key. Protection starts after you verify the first code.',code:'6-digit verification code',verify:'Verify and continue',wait:'Please wait...',error:'The action failed. Check your code and try again.',limit:'Too many attempts. Try again in one minute.',lost:'If you cannot access your phone, contact the project administrator for account recovery.',back:'Go back',logout:'Sign out',disable:'Disable two-factor authentication',disableHint:'Enter a fresh verification code to disable it. You will then need to sign in again.',confirmDisable:'Verify code and disable',cancel:'Cancel'}
};
type Reply={error?:string;enabled?:boolean;factors?:{id:string}[];aal?:string;id?:string;qr?:string;secret?:string;next?:string};
export default function SecurityPage(){
 const[lang,setLang]=useState<'tr'|'ru'|'en'>('tr');
 const[factor,setFactor]=useState('');const[setup,setSetup]=useState<{qr:string;secret:string}|null>(null);
 const[ready,setReady]=useState(false);const[enabled,setEnabled]=useState(false);const[verified,setVerified]=useState(false);
 const[disabling,setDisabling]=useState(false);const[busy,setBusy]=useState(false);const[error,setError]=useState('');
 const t=copy[lang];
 function next(){const v=new URLSearchParams(location.search).get('return_to');return v&&/^\/(admin|partner|tourist)(#settings)?$/.test(v)?v:'/tourist#settings'}
 useEffect(()=>{
  try{const l=localStorage.getItem('city-guide-language')||localStorage.getItem('city-guide-signin-language');if(l==='ru'||l==='en'||l==='tr')setLang(l)}catch{}
  fetch('/api/auth/mfa',{cache:'no-store'}).then(async r=>{
   if(r.status===401){location.assign('/signin?return_to='+encodeURIComponent(next()));return}
   const d=await r.json() as Reply;if(!r.ok||typeof d.enabled!=='boolean')throw new Error(d.error);
   setFactor(d.factors?.[0]?.id||'');setEnabled(d.enabled);setVerified(d.aal==='aal2');setReady(true);
  }).catch(()=>setError('failed'));
 },[]);
 async function enroll(){setBusy(true);setError('');try{
  const r=await fetch('/api/auth/mfa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'enroll'})});
  const d=await r.json() as Reply;if(!r.ok||!d.id||!d.qr||!d.secret)throw new Error(d.error);
  setFactor(d.id);setSetup({qr:d.qr,secret:d.secret});
 }catch(e){setError(e instanceof Error?e.message:'failed')}finally{setBusy(false)}}
 async function verify(e:FormEvent<HTMLFormElement>){e.preventDefault();const code=new FormData(e.currentTarget).get('code');setBusy(true);setError('');try{
  const r=await fetch('/api/auth/mfa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:disabling?'disable':'verify',factorId:factor,code,returnTo:next()})});
  const d=await r.json() as Reply;if(!r.ok||!d.next)throw new Error(d.error);setSetup(null);location.assign(d.next);
 }catch(e){setError(e instanceof Error?e.message:'failed')}finally{setBusy(false)}}
 async function logout(){await fetch('/api/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'signout'})});location.assign('/signin')}
 const button={padding:13,borderRadius:9,background:'#c93270',color:'#fff',cursor:'pointer',width:'100%'};
 const showCode=!!setup||(enabled&&(!verified||disabling));
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f9f7fa'}}><section lang={lang} style={{background:'white',padding:28,borderRadius:20,maxWidth:440,width:'100%',display:'grid',gap:18}}>
  <header style={{display:'flex',justifyContent:'space-between',gap:20}}><b>City Guide</b><select aria-label="Language" value={lang} onChange={e=>setLang(e.target.value as typeof lang)}><option value="tr">Türkçe</option><option value="ru">Русский</option><option value="en">English</option></select></header>
  <h1 style={{fontSize:26,fontWeight:700}}>{t.title}</h1><p>{t.intro}</p>
  {!ready&&!error&&<p>{t.wait}</p>}
  {ready&&<p role="status"><b>{enabled?t.on:t.off}</b></p>}
  {ready&&!enabled&&!setup&&<button style={button} disabled={busy} onClick={enroll}>{busy?t.wait:t.setup}</button>}
  {setup&&<><p>{t.scan}</p><img alt="Authenticator QR" width={240} height={240} style={{margin:'auto'}} src={setup.qr.startsWith('data:image/svg+xml')?setup.qr:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(setup.qr)}/><code style={{overflowWrap:'anywhere',fontSize:14}}>{setup.secret}</code></>}
  {enabled&&!verified&&<p>{t.challenge}</p>}
  {disabling&&<p>{t.disableHint}</p>}
  {showCode&&factor&&<form onSubmit={verify} style={{display:'grid',gap:14}}><label>{t.code}<input name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus style={{display:'block',width:'100%',padding:12,border:'1px solid #ddd',borderRadius:8,marginTop:8}}/></label><button style={button} disabled={busy}>{busy?t.wait:disabling?t.confirmDisable:t.verify}</button></form>}
  {ready&&enabled&&verified&&!disabling&&<button style={button} disabled={busy} onClick={()=>{setDisabling(true);setError('')}}>{t.disable}</button>}
  {(disabling||setup)&&<button disabled={busy} onClick={()=>{setDisabling(false);setSetup(null);if(!enabled)setFactor('');setError('')}}>{t.cancel}</button>}
  {ready&&(!enabled||verified)&&<button disabled={busy} onClick={()=>location.assign(next())}>{t.back}</button>}
  {error&&<p role="alert" style={{color:'#a20b40'}}>{error==='rate_limited'?t.limit:t.error}</p>}
  {enabled&&<p style={{fontSize:13,color:'#666'}}>{t.lost}</p>}<button disabled={busy} onClick={logout} style={{textDecoration:'underline',cursor:'pointer'}}>{t.logout}</button>
 </section></main>;
}
