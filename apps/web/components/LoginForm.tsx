'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
export default function LoginForm(){
  const {t,locale}=useAppPreferences();
  const {notify}=useToast();
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
        const msg=t(response.status===429?'login.tooMany':
          response.status===503?'login.temporarily':'login.invalid');
        setError(msg);
        notify({tone:response.status===429?'warning':'error',
          title:locale==='fr'?'Connexion refusée':'Sign-in rejected',detail:msg});return;
      }
      notify({tone:'success',title:locale==='fr'?'Connexion établie':'Signed in',
        detail:locale==='fr'?'Votre bibliothèque privée BookStudio est accessible.':
          'Your private BookStudio library is now available.'});
      router.push('/library');router.refresh();
    }catch{const msg=t('login.temporarily');setError(msg);
      notify({tone:'error',title:locale==='fr'?'Connexion interrompue':'Sign-in interrupted',detail:msg});}
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
