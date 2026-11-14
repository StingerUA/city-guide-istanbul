'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {CONTACT_EMAIL,type LegalLang} from '@/lib/legal';

const copy={
 en:{title:'Delete your account',intro:'This permanently deletes your City Guide account and the data linked to it. This cannot be undone.',
  deletedTitle:'What will be deleted',deleted:['Your sign-in account and profile','Your bookings, reviews, feedback and favorites','Photos you uploaded'],
  partner:'You have a partner account: your listings will be unpublished (archived) and their phone number and website removed.',
  kept:'Copies in provider backups may remain for a limited time. See the Privacy Policy for details.',
  typeEmail:'To confirm, type your account email',button:'Delete my account permanently',wait:'Please wait...',
  done:'Your account has been deleted.',signIn:'Go to sign-in',
  needSignin:'Sign in first. After signing in, open Settings → Data & privacy → Delete account.',signInBtn:'Sign in',
  needMfa:'Complete two-factor verification first, then return to this page.',mfaBtn:'Open security settings',
  admin:'This is a project owner account and cannot be deleted here. Contact the project team.',
  email_mismatch:'The email does not match your account.',rate_limited:'Too many attempts. Try again in a minute.',
  failed:'Could not delete the account. Please try again or email us.',
  noAccess:'Cannot sign in? Email {email} from your account address and we will delete your account.',
  policy:'Privacy Policy',back:'Back to the app'},
 ru:{title:'Удаление аккаунта',intro:'Аккаунт City Guide и связанные с ним данные будут удалены безвозвратно. Отменить это нельзя.',
  deletedTitle:'Что будет удалено',deleted:['Аккаунт для входа и профиль','Ваши бронирования, отзывы, обратная связь и избранное','Загруженные вами фотографии'],
  partner:'У вас аккаунт партнёра: ваши заведения будут сняты с публикации (архивированы), телефон и сайт в карточках удалятся.',
  kept:'Копии в резервных копиях поставщиков могут храниться ограниченное время. Подробнее в Политике конфиденциальности.',
  typeEmail:'Для подтверждения введите email вашего аккаунта',button:'Удалить аккаунт навсегда',wait:'Подождите...',
  done:'Ваш аккаунт удалён.',signIn:'Перейти ко входу',
  needSignin:'Сначала войдите в аккаунт. После входа откройте Настройки → Данные и конфиденциальность → Удалить аккаунт.',signInBtn:'Войти',
  needMfa:'Сначала подтвердите двухфакторную аутентификацию, затем вернитесь на эту страницу.',mfaBtn:'Открыть настройки безопасности',
  admin:'Это аккаунт владельца проекта, его нельзя удалить здесь. Свяжитесь с командой проекта.',
  email_mismatch:'Email не совпадает с вашим аккаунтом.',rate_limited:'Слишком много попыток. Попробуйте через минуту.',
  failed:'Не удалось удалить аккаунт. Повторите попытку или напишите нам.',
  noAccess:'Не можете войти? Напишите на {email} с адреса вашего аккаунта, и мы удалим аккаунт.',
  policy:'Политика конфиденциальности',back:'Вернуться в приложение'},
 tr:{title:'Hesabı sil',intro:'City Guide hesabınız ve ona bağlı veriler kalıcı olarak silinir. Bu işlem geri alınamaz.',
  deletedTitle:'Nelerin silineceği',deleted:['Giriş hesabınız ve profiliniz','Rezervasyonlarınız, yorumlarınız, geri bildirimleriniz ve favorileriniz','Yüklediğiniz fotoğraflar'],
  partner:'İş ortağı hesabınız var: mekan kayıtlarınız yayından kaldırılır (arşivlenir), telefon ve web sitesi bilgileri silinir.',
  kept:'Sağlayıcı yedeklerindeki kopyalar sınırlı bir süre kalabilir. Ayrıntılar için Gizlilik Politikası’na bakın.',
  typeEmail:'Onaylamak için hesabınızın e-postasını yazın',button:'Hesabımı kalıcı olarak sil',wait:'Lütfen bekleyin...',
  done:'Hesabınız silindi.',signIn:'Girişe git',
  needSignin:'Önce giriş yapın. Girişten sonra Ayarlar → Veriler ve gizlilik → Hesabı sil yolunu izleyin.',signInBtn:'Giriş yap',
  needMfa:'Önce iki faktörlü doğrulamayı tamamlayın, sonra bu sayfaya dönün.',mfaBtn:'Güvenlik ayarlarını aç',
  admin:'Bu bir proje sahibi hesabıdır ve burada silinemez. Proje ekibiyle iletişime geçin.',
  email_mismatch:'E-posta hesabınızla eşleşmiyor.',rate_limited:'Çok fazla deneme. Bir dakika sonra tekrar deneyin.',
  failed:'Hesap silinemedi. Lütfen tekrar deneyin veya bize yazın.',
  noAccess:'Giriş yapamıyor musunuz? Hesap adresinizden {email} adresine yazın, hesabınızı silelim.',
  policy:'Gizlilik Politikası',back:'Uygulamaya dön'},
};
type Info={email:string;role:'admin'|'partner'|'tourist';canDelete:boolean};
type State='loading'|'anon'|'mfa'|'ready'|'done'|'error';

export default function DeleteAccountPage(){
 const[lang,setLang]=useState<LegalLang>('en');
 const[state,setState]=useState<State>('loading');
 const[info,setInfo]=useState<Info|null>(null);
 const[typed,setTyped]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('');
 const t=copy[lang];
 useEffect(()=>{
  try{
   const q=new URLSearchParams(location.search).get('lang');
   const saved=localStorage.getItem('city-guide-language')||localStorage.getItem('city-guide-signin-language');
   const pick=[q,saved].find(v=>v==='ru'||v==='tr'||v==='en');
   if(pick)setLang(pick as LegalLang);
  }catch{}
  fetch('/api/account/delete',{cache:'no-store'}).then(async r=>{
   const d=await r.json() as Partial<Info>&{error?:string};
   if(r.status===401){setState('anon');return}
   if(r.status===403&&d.error==='mfa_required'){setState('mfa');return}
   if(!r.ok||typeof d.email!=='string')throw new Error(d.error);
   setInfo(d as Info);setState('ready');
  }).catch(()=>setState('error'));
 },[]);
 function change(next:LegalLang){setLang(next);try{localStorage.setItem('city-guide-language',next)}catch{}}
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{
   const r=await fetch('/api/account/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:typed})});
   const d=await r.json() as {error?:string};
   if(!r.ok)throw new Error(d.error||'failed');
   setState('done');
  }catch(err){setError(err instanceof Error?err.message:'failed')}finally{setBusy(false)}
 }
 const shown=error==='email_mismatch'||error==='rate_limited'?t[error]:error?t.failed:'';
 const link={color:'#c93270',textDecoration:'underline'};
 const button={padding:13,borderRadius:9,background:'#c93270',color:'#fff',cursor:'pointer',width:'100%',display:'block',textAlign:'center' as const};
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f9f7fa'}}>
  <section lang={lang} style={{background:'white',padding:28,borderRadius:20,maxWidth:480,width:'100%',display:'grid',gap:16,lineHeight:1.5}}>
   <header style={{display:'flex',justifyContent:'space-between',gap:20}}>
    <b>City Guide</b>
    <select aria-label="Language" value={lang} onChange={e=>change(e.target.value as LegalLang)}>
     <option value="en">English</option><option value="ru">Русский</option><option value="tr">Türkçe</option>
    </select>
   </header>
   <h1 style={{fontSize:26,fontWeight:700}}>{t.title}</h1>
   {state==='loading'&&<p>{t.wait}</p>}
   {state==='error'&&<p role="alert" style={{color:'#a20b40'}}>{t.failed}</p>}
   {state==='anon'&&<><p>{t.needSignin}</p><a href="/signin?return_to=/tourist" style={button}>{t.signInBtn}</a></>}
   {state==='mfa'&&<><p>{t.needMfa}</p><a href="/security?return_to=/tourist" style={button}>{t.mfaBtn}</a></>}
   {state==='done'&&<><p role="status"><b>{t.done}</b></p><a href="/signin" style={button}>{t.signIn}</a></>}
   {state==='ready'&&info&&<>
    <p>{t.intro}</p>
    <div><b>{t.deletedTitle}</b><ul style={{paddingLeft:22,listStyle:'disc',marginTop:6,display:'grid',gap:4}}>{t.deleted.map(x=><li key={x}>{x}</li>)}</ul></div>
    {info.role==='partner'&&<p>{t.partner}</p>}
    <p style={{fontSize:13,color:'#666'}}>{t.kept}</p>
    {!info.canDelete?<p role="alert" style={{color:'#a20b40'}}>{t.admin}</p>:
     <form onSubmit={submit} style={{display:'grid',gap:12}}>
      <label>{t.typeEmail}<input type="email" value={typed} onChange={e=>setTyped(e.target.value)} placeholder={info.email} autoComplete="off" required style={{display:'block',width:'100%',padding:12,border:'1px solid #ddd',borderRadius:8,marginTop:8}}/></label>
      <button disabled={busy||typed.trim().toLowerCase()!==info.email.toLowerCase()} style={{...button,background:'#a20b40',opacity:busy||typed.trim().toLowerCase()!==info.email.toLowerCase()?0.5:1}}>{busy?t.wait:t.button}</button>
      {shown&&<p role="alert" style={{color:'#a20b40'}}>{shown}</p>}
     </form>}
   </>}
   <p style={{fontSize:13,color:'#666'}}>{t.noAccess.replace('{email}',CONTACT_EMAIL)}</p>
   <footer style={{display:'flex',gap:16,flexWrap:'wrap'}}>
    <a href={'/privacy?lang='+lang} style={link}>{t.policy}</a>
    <a href="/tourist" style={link}>{t.back}</a>
   </footer>
  </section>
 </main>;
}
