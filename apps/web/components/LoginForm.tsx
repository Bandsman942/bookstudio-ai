'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function LoginForm(){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),router=useRouter();
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('');
    try{
      const res=await fetch('/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      if(!res.ok){setError('Adresse e-mail ou mot de passe incorrect.');return;}
      router.push('/library');router.refresh();
    }catch{setError('Connexion temporairement indisponible.')}finally{setBusy(false);}
  }
  return <form className="form" onSubmit={submit}>
    <label>Adresse e-mail<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="vous@exemple.com"/></label>
    <label>Mot de passe<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••"/></label>
    {error&&<div role="alert" className="form-error">{error}</div>}
    <button disabled={busy} className="button full">{busy?'Connexion…':'Accéder à mon atelier →'}</button>
    <small className="note">Les inscriptions publiques seront ouvertes après validation des contrôles de sécurité.</small>
  </form>;
}
