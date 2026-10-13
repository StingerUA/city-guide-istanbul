'use client';

import {useEffect,useState,type FormEvent} from 'react';

export default function SigninPage(){
  const [signup,setSignup]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [sent,setSent]=useState(false);
  useEffect(()=>{
    const reason=new URLSearchParams(window.location.search).get('oauth_error');
    if(!reason)return;
    setError(reason==='denied'?'Вход через Google отменён. / Google ile giriş iptal edildi.':
      reason==='invalid_flow'?'Вход через Google устарел. Повторите попытку. / Google ile tekrar deneyin.':
      'Не удалось войти через Google. Проверьте настройки Google в Supabase. / Google girişi başarısız.');
  },[]);
  function googleSignin(){
    const next=new URLSearchParams(window.location.search).get('return_to')||'/tourist';
    window.location.assign('/api/auth/google?return_to='+encodeURIComponent(next));
  }
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError('');setBusy(true);
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
    }catch(err){setError(err instanceof Error?err.message:'failed')}
    finally{setBusy(false)}
  }
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f9f7fa'}}>
    <section style={{background:'white',borderRadius:20,padding:28,width:'100%',maxWidth:400,boxShadow:'0 6px 30px #00000012'}}>
      <h1 style={{fontSize:28,fontWeight:700,marginBottom:6}}>City Guide</h1>
      <p style={{color:'#666',marginBottom:24}}>{signup?'Регистрация / Kayıt ol':'Вход / Giriş yap'}</p>
      {sent?<p>Проверьте почту и подтвердите email, затем войдите. / E-postanızı doğrulayın.</p>:
      <form onSubmit={submit} style={{display:'grid',gap:14}}>
        <label>Email<input name="email" type="email" autoComplete="email" required
          style={{display:'block',width:'100%',border:'1px solid #ddd',borderRadius:9,padding:12,marginTop:6}}/></label>
        <label>Пароль / Şifre<input name="password" type="password" minLength={8} required
          autoComplete={signup?'new-password':'current-password'}
          style={{display:'block',width:'100%',border:'1px solid #ddd',borderRadius:9,padding:12,marginTop:6}}/></label>
        {error&&<p role="alert" style={{color:'#a20b40'}}>{error}</p>}
        <button type="submit" disabled={busy} style={{background:'#c93270',color:'white',padding:12,borderRadius:9,cursor:'pointer'}}>
          {busy?'…':signup?'Создать аккаунт / Kayıt ol':'Войти / Giriş yap'}
        </button>
      </form>}
      <div style={{display:'flex',alignItems:'center',gap:12,margin:'20px 0',color:'#999',fontSize:12}}>
        <div style={{height:1,background:'#e5dde4',flex:1}}/>
        или / veya
        <div style={{height:1,background:'#e5dde4',flex:1}}/>
      </div>
      <button type="button" onClick={googleSignin} aria-label="Войти с Google / Google ile giriş yap"
        style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,padding:'12px 16px',
          border:'1px solid #dadce0',borderRadius:9,background:'#fff',color:'#202124',fontWeight:600,
          cursor:'pointer',width:'100%',fontSize:14}}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.42-.19-2.11H12v4h5.24a4.5 4.5 0 0 1-1.95 2.95v2.46h3.15c1.84-1.69 2.91-4.18 2.91-7.3Z"/>
          <path fill="#34A853" d="M12 21.75a9.76 9.76 0 0 0 6.44-2.35l-3.15-2.46a5.86 5.86 0 0 1-8.72-3.07H3.33v2.52A9.75 9.75 0 0 0 12 21.75Z"/>
          <path fill="#FBBC05" d="M6.57 13.87a5.86 5.86 0 0 1 0-3.74V7.61H3.33a9.75 9.75 0 0 0 0 8.78l3.24-2.52Z"/>
          <path fill="#EA4335" d="M12 6.14c1.34 0 2.54.46 3.48 1.37l2.75-2.75A9.37 9.37 0 0 0 12 2.25a9.75 9.75 0 0 0-8.67 5.36l3.24 2.52A5.83 5.83 0 0 1 12 6.14Z"/>
        </svg>
        Продолжить с Google / Google ile devam et
      </button>
      <button type="button" onClick={()=>{setSignup(!signup);setSent(false);setError('')}}
        style={{marginTop:18,color:'#9b2458',textDecoration:'underline'}}>
        {signup?'Уже есть аккаунт? Войти':'Нет аккаунта? Зарегистрироваться'}
      </button>
    </section>
  </main>
}
