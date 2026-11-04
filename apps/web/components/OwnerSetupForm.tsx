'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useToast} from './ToastProvider';
import {useAppPreferences} from './AppPreferences';
export default function OwnerSetupForm(){
 const {notify}=useToast();const {locale}=useAppPreferences();
 const [token,setToken]=useState(''),[name,setName]=useState(''),
       [email,setEmail]=useState(''),[password,setPassword]=useState(''),
       [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false);
 const router=useRouter();
 async function activate(e:React.FormEvent){
   e.preventDefault();setBusy(true);setError('');
   try{
     const r=await fetch('/api/v1/auth/setup',{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({token,email,name,password})});
     if(!r.ok){
       const msg=r.status===403?
         (locale==='fr'?'Activation refusée : code expiré, incorrect ou compte propriétaire déjà activé.':
           'Activation refused: expired/incorrect code or an existing owner account.'):
         (locale==='fr'?'Le formulaire d’activation n’a pas été accepté. Vérifiez les champs requis.':
           'The activation form was rejected. Check the required fields.');
       setError(msg);
       notify({tone:'error',title:locale==='fr'?'Activation de l’atelier refusée':'Workspace activation refused',
         detail:msg});return;
     }
     setSuccess(true);setToken('');setPassword('');
     notify({tone:'success',title:locale==='fr'?'Atelier privé activé':'Private workspace activated',
       detail:locale==='fr'?'Votre compte propriétaire est prêt. Connectez-vous avec votre adresse e-mail.':
         'Your owner account is ready. Sign in using your email address.'});
     router.push('/login');router.refresh();
   }catch{const msg=locale==='fr'?'Connexion interrompue pendant l’activation. Réessayez sans partager votre code.':
      'Connection interrupted during activation. Retry without sharing your code.';
     setError(msg);notify({tone:'error',title:locale==='fr'?'Activation interrompue':'Activation interrupted',detail:msg});}
   finally{setBusy(false);}
 }
 if(success)return <div role="status" className="versions-success">Atelier activé. Redirection vers la connexion…</div>;
 return <form className="form" onSubmit={activate} autoComplete="off">
  <label>Code d'activation à usage unique<input required type="password" value={token} onChange={e=>setToken(e.target.value)} minLength={43} maxLength={64} spellCheck={false} placeholder="Code communiqué exclusivement au propriétaire"/></label>
  <label>Votre nom d'auteur<input required type="text" minLength={2} maxLength={140} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>
  <label>Votre adresse e-mail<input required type="email" value={email} maxLength={320} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></label>
  <label>Choisissez votre mot de passe<input required type="password" minLength={16} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/></label>
  <small className="note">Au moins 16 caractères. Le code expire automatiquement et ne fonctionne qu'une fois. Ne le partagez avec personne.</small>
  {error&&<div role="alert" className="form-error">{error}</div>}
  <button className="button full" type="submit" disabled={busy}>{busy?'Activation…':'Activer mon atelier privé →'}</button>
 </form>;
}
