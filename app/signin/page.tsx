'use client';

import {useEffect,useState,type FormEvent} from 'react';

type Lang='tr'|'ru'|'en';
type Copy={
  language:string;
  headingSignIn:string;
  headingSignUp:string;
  email:string;
  password:string;
  signIn:string;
  signUp:string;
  signInBusy:string;
  or:string;
  google:string;
  createAccount:string;
  alreadyHaveAccount:string;
  checkEmail:string;
  errorGeneric:string;
  errors:Record<string,string>;
};

const translations:Record<Lang,Copy>={
  tr:{
    language:'Dil',
    headingSignIn:'Giriş yap',
    headingSignUp:'Hesap oluştur',
    email:'E-posta adresi',
    password:'Şifre',
    signIn:'Giriş yap',
    signUp:'Hesap oluştur',
    signInBusy:'Lütfen bekleyin…',
    or:'veya',
    google:'Google ile devam et',
    createAccount:'Hesabınız yok mu? Kayıt olun',
    alreadyHaveAccount:'Zaten hesabınız var mı? Giriş yapın',
    checkEmail:'E-postanızı kontrol edin ve hesabınızı doğruladıktan sonra giriş yapın.',
    errorGeneric:'İşlem gerçekleştirilemedi. Lütfen tekrar deneyin.',
    errors:{
      denied:'Google ile giriş iptal edildi.',
      invalid_flow:'Google oturumu sona erdi. Lütfen tekrar deneyin.',
      exchange_failed:'Google ile giriş tamamlanamadı. Lütfen tekrar deneyin.',
      unverified:'Google hesabının e-posta adresi doğrulanamadı.',
      unavailable:'Giriş hizmeti şu anda kullanılamıyor.',
      supabase_unavailable:'Giriş hizmetine ulaşılamıyor. Daha sonra tekrar deneyin.',
      supabase_not_configured:'Giriş hizmeti henüz yapılandırılmadı.',
      invalid_credentials:'E-posta veya şifre hatalı.',
      signup_failed:'Hesap oluşturulamadı. Bilgilerinizi kontrol edin.',
      email_not_verified:'Önce e-posta adresinizi doğrulayın.',
      forbidden:'Bu işleme izin verilmiyor.',
      invalid_input:'Girilen bilgileri kontrol edin.'
    }
  },
  ru:{
    language:'Язык',
    headingSignIn:'Вход',
    headingSignUp:'Регистрация',
    email:'Электронная почта',
    password:'Пароль',
    signIn:'Войти',
    signUp:'Создать аккаунт',
    signInBusy:'Подождите…',
    or:'или',
    google:'Продолжить с Google',
    createAccount:'Нет аккаунта? Зарегистрироваться',
    alreadyHaveAccount:'Уже есть аккаунт? Войти',
    checkEmail:'Проверьте почту, подтвердите адрес электронной почты и затем войдите.',
    errorGeneric:'Не удалось выполнить действие. Попробуйте ещё раз.',
    errors:{
      denied:'Вход через Google отменён.',
      invalid_flow:'Срок действия входа через Google истёк. Попробуйте ещё раз.',
      exchange_failed:'Не удалось завершить вход через Google. Попробуйте ещё раз.',
      unverified:'Не удалось подтвердить email аккаунта Google.',
      unavailable:'Авторизация временно недоступна.',
      supabase_unavailable:'Сервис авторизации недоступен. Попробуйте позднее.',
      supabase_not_configured:'Сервис авторизации пока не настроен.',
      invalid_credentials:'Неправильная почта или пароль.',
      signup_failed:'Не удалось зарегистрироваться. Проверьте введённые данные.',
      email_not_verified:'Сначала подтвердите адрес электронной почты.',
      forbidden:'Действие запрещено.',
      invalid_input:'Проверьте введённые данные.'
    }
  },
  en:{
    language:'Language',
    headingSignIn:'Sign in',
    headingSignUp:'Create an account',
    email:'Email address',
    password:'Password',
    signIn:'Sign in',
    signUp:'Create account',
    signInBusy:'Please wait…',
    or:'or',
    google:'Continue with Google',
    createAccount:"Don't have an account? Sign up",
    alreadyHaveAccount:'Already have an account? Sign in',
    checkEmail:'Check your inbox, verify your email address, then sign in.',
    errorGeneric:'Something went wrong. Please try again.',
    errors:{
      denied:'Google sign-in was cancelled.',
      invalid_flow:'Your Google sign-in session expired. Please try again.',
      exchange_failed:'Google sign-in could not be completed. Please try again.',
      unverified:'Your Google account email could not be verified.',
      unavailable:'Sign-in is currently unavailable.',
      supabase_unavailable:'The sign-in service is unavailable. Please try later.',
      supabase_not_configured:'The sign-in service is not configured yet.',
      invalid_credentials:'Incorrect email or password.',
      signup_failed:'Your account could not be created. Check your details.',
      email_not_verified:'Please verify your email address first.',
      forbidden:'This action is not allowed.',
      invalid_input:'Please check the information you entered.'
    }
  }
};

const LANGUAGE_STORAGE_KEY='city-guide-signin-language';
function isLang(value:string|null):value is Lang {
  return value==='tr'||value==='ru'||value==='en';
}

export default function SigninPage(){
  // Turkish is the default for new visitors, regardless of browser language.
  const [lang,setLang]=useState<Lang>('tr');
  const [signup,setSignup]=useState(false);
  const [busy,setBusy]=useState(false);
  const [errorCode,setErrorCode]=useState('');
  const [sent,setSent]=useState(false);
  const t=translations[lang];

  useEffect(()=>{
    const search=new URLSearchParams(window.location.search);
    const requested=search.get('lang');
    let stored:string|null=null;
    try {stored=window.localStorage.getItem(LANGUAGE_STORAGE_KEY)} catch { /* Storage may be disabled. */ }
    if(isLang(requested))setLang(requested);
    else if(isLang(stored))setLang(stored);
    const reason=search.get('oauth_error');
    if(reason)setErrorCode(reason);
  },[]);

  function changeLanguage(next:Lang){
    setLang(next);
    try {window.localStorage.setItem(LANGUAGE_STORAGE_KEY,next)} catch { /* Optional preference. */ }
  }
  function googleSignin(){
    const next=new URLSearchParams(window.location.search).get('return_to')||'/tourist';
    window.location.assign('/api/auth/google?return_to='+encodeURIComponent(next));
  }
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setErrorCode('');setBusy(true);
    const form=new FormData(e.currentTarget);
    try{
      const rawReturn=new URLSearchParams(window.location.search).get('return_to')||'/tourist';
      const response=await fetch('/api/auth/session',{
        method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
        body:JSON.stringify({action:signup?'signup':'signin',
          email:form.get('email'),password:form.get('password'),returnTo:rawReturn})
      });
      const data=await response.json() as {error?:string;next?:string;confirmationRequired?:boolean};
      if(!response.ok)throw new Error(data.error||'failed');
      if(data.confirmationRequired){setSent(true);return}
      window.location.assign(data.next||'/tourist');
    }catch(err){setErrorCode(err instanceof Error?err.message:'failed')}
    finally{setBusy(false)}
  }

  const inputStyle={display:'block',width:'100%',border:'1px solid #ddd',borderRadius:9,padding:12,marginTop:6} as const;
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f9f7fa'}}>
    <section lang={lang} style={{background:'white',borderRadius:20,padding:28,width:'100%',maxWidth:400,boxShadow:'0 6px 30px #00000012'}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:20}}>
        <h1 style={{fontSize:28,fontWeight:700,margin:0}}>City Guide</h1>
        <label htmlFor="signin-language" style={{fontSize:12,color:'#555',display:'grid',gap:4}}>
          {t.language}
          <select id="signin-language" aria-label={t.language} value={lang}
            onChange={e=>changeLanguage(e.target.value as Lang)}
            style={{background:'#fff',color:'#333',border:'1px solid #ddd',borderRadius:8,padding:'7px 9px',fontSize:13,cursor:'pointer'}}>
            <option value="tr">TR · Türkçe</option>
            <option value="ru">RU · Русский</option>
            <option value="en">EN · English</option>
          </select>
        </label>
      </header>
      <p style={{color:'#666',marginBottom:24}}>{signup?t.headingSignUp:t.headingSignIn}</p>
      {sent?<p role="status">{t.checkEmail}</p>:
      <form onSubmit={submit} style={{display:'grid',gap:14}}>
        <label>{t.email}
          <input name="email" type="email" autoComplete="email" required style={inputStyle}/>
        </label>
        <label>{t.password}
          <input name="password" type="password" minLength={8} required
            autoComplete={signup?'new-password':'current-password'} style={inputStyle}/>
        </label>
        {errorCode&&<p role="alert" style={{color:'#a20b40'}}>
          {t.errors[errorCode]||t.errorGeneric}
        </p>}
        <button type="submit" disabled={busy} style={{background:'#c93270',color:'white',
          padding:12,borderRadius:9,cursor:busy?'wait':'pointer',opacity:busy?0.7:1}}>
          {busy?t.signInBusy:signup?t.signUp:t.signIn}
        </button>
      </form>}
      {sent&&errorCode&&<p role="alert" style={{color:'#a20b40'}}>{t.errors[errorCode]||t.errorGeneric}</p>}
      <div style={{display:'flex',alignItems:'center',gap:12,margin:'20px 0',color:'#999',fontSize:12}}>
        <div style={{height:1,background:'#e5dde4',flex:1}}/>
        {t.or}
        <div style={{height:1,background:'#e5dde4',flex:1}}/>
      </div>
      <button type="button" onClick={googleSignin} aria-label={t.google}
        style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,padding:'12px 16px',
          border:'1px solid #dadce0',borderRadius:9,background:'#fff',color:'#202124',fontWeight:600,
          cursor:'pointer',width:'100%',fontSize:14}}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.42-.19-2.11H12v4h5.24a4.5 4.5 0 0 1-1.95 2.95v2.46h3.15c1.84-1.69 2.91-4.18 2.91-7.3Z"/>
          <path fill="#34A853" d="M12 21.75a9.76 9.76 0 0 0 6.44-2.35l-3.15-2.46a5.86 5.86 0 0 1-8.72-3.07H3.33v2.52A9.75 9.75 0 0 0 12 21.75Z"/>
          <path fill="#FBBC05" d="M6.57 13.87a5.86 5.86 0 0 1 0-3.74V7.61H3.33a9.75 9.75 0 0 0 0 8.78l3.24-2.52Z"/>
          <path fill="#EA4335" d="M12 6.14c1.34 0 2.54.46 3.48 1.37l2.75-2.75A9.37 9.37 0 0 0 12 2.25a9.75 9.75 0 0 0-8.67 5.36l3.24 2.52A5.83 5.83 0 0 1 12 6.14Z"/>
        </svg>
        {t.google}
      </button>
      <button type="button" onClick={()=>{setSignup(!signup);setSent(false);setErrorCode('')}}
        style={{marginTop:18,color:'#9b2458',textDecoration:'underline',cursor:'pointer'}}>
        {signup?t.alreadyHaveAccount:t.createAccount}
      </button>
    </section>
  </main>
}
