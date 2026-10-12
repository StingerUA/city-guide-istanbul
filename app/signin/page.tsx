'use client';

import {useState,type FormEvent} from 'react';

export default function SigninPage(){
  const [signup,setSignup]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [sent,setSent]=useState(false);
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
      <button type="button" onClick={()=>{setSignup(!signup);setSent(false);setError('')}}
        style={{marginTop:18,color:'#9b2458',textDecoration:'underline'}}>
        {signup?'Уже есть аккаунт? Войти':'Нет аккаунта? Зарегистрироваться'}
      </button>
    </section>
  </main>
}
