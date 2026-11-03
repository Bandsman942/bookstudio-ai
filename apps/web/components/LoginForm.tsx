'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useAppPreferences} from './AppPreferences';
export default function LoginForm(){
  const {t}=useAppPreferences();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),
    [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const router=useRouter();
  async function submit(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');
    try{
      const response=await fetch('/api/v1/auth/login',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      if(!response.ok){
        setError(t(response.status===429?'login.tooMany':
          response.status===503?'login.temporarily':'login.invalid'));
        return;
      }
      router.push('/library');router.refresh();
    }catch{setError(t('login.temporarily'));}
    finally{setBusy(false);}
  }
  return <form className="form" onSubmit={submit}>
    <label>{t('login.email')}<input required type="email" value={email}
      onChange={event=>setEmail(event.target.value)} autoComplete="username" placeholder={t('login.emailExample')}/></label>
    <label>{t('login.password')}<input required type="password" value={password}
      onChange={event=>setPassword(event.target.value)} autoComplete="current-password" placeholder="••••••••"/></label>
    {error&&<div role="alert" className="form-error">{error}</div>}
    <button disabled={busy} className="button full">{t(busy?'login.submitting':'login.submit')}</button>
    <small className="note">{t('login.signupNote')}</small>
  </form>;
}
