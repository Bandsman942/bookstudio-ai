'use client';

import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import ActionMenu from './ActionMenu';

type Props={
  bookId:string;
  title:string;
  updatedAt:string;
  editable:boolean;
  showOpen?:boolean;
  onArchive?:'refresh'|'library';
};

/** Shared book commands. The same confirm dialogs serve book cards and detail. */
export default function BookActionsMenu({bookId,title,updatedAt,editable,showOpen=false,onArchive='library'}:Props){
  const [mode,setMode]=useState<'rename'|'archive'|null>(null);
  const [desired,setDesired]=useState(title);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const router=useRouter();
  useEffect(()=>{
    if(!mode)return;
    function esc(event:globalThis.KeyboardEvent){if(event.key==='Escape'&&!busy)setMode(null);}
    document.addEventListener('keydown',esc);
    return ()=>document.removeEventListener('keydown',esc);
  },[mode,busy]);

  function open(mode:'rename'|'archive'){
    setError('');setDesired(title);setMode(mode);
  }
  async function commit(action:'rename'|'archive'){
    if(busy)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/v1/books/'+bookId,{
        method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          action,expectedUpdatedAt:updatedAt,
          ...(action==='rename'?{title:desired}:{})
        })
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok){
        setError(response.status===409
          ?'Le livre a changé dans un autre onglet. Rechargez la page pour réessayer.'
          :payload.error||'Impossible de modifier ce livre.');
        return;
      }
      setMode(null);
      if(action==='archive'&&onArchive==='library')router.push('/library');
      router.refresh();
    }catch{
      setError('Connexion interrompue. La modification n’a pas été confirmée.');
    }finally{setBusy(false);}
  }

  const actions=[
    ...(showOpen?[{label:'Ouvrir le livre',href:'/books/'+bookId}]:[]),
    ...(editable?[
      {label:'Renommer',onSelect:()=>open('rename'),separatorBefore:showOpen},
      {label:'Archiver…',onSelect:()=>open('archive'),destructive:true},
    ]:[])
  ];
  return <>
    <ActionMenu label={'Actions pour « '+title+' »'} actions={actions} disabled={busy}/>
    {mode&&<div className="modal-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target&&!busy)setMode(null);}}>
      {mode==='rename'?<form className="modal" onSubmit={event=>{event.preventDefault();void commit('rename');}}
        role="dialog" aria-modal="true" aria-label={'Renommer « '+title+' »'}>
        <button className="close" type="button" aria-label="Fermer" disabled={busy} onClick={()=>setMode(null)}>×</button>
        <div className="eyebrow">GESTION DE L'OUVRAGE</div><h2>Renommer ce livre</h2>
        <label>Nouveau titre<input autoFocus required minLength={2} maxLength={180}
          value={desired} onChange={event=>setDesired(event.target.value)}/></label>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="button full" type="submit" disabled={busy}>{busy?'Enregistrement…':'Enregistrer le titre'}</button>
      </form>:<div className="modal" role="dialog" aria-modal="true"
        aria-label={'Confirmer l’archivage de « '+title+' »'}>
        <button className="close" type="button" aria-label="Fermer" disabled={busy} onClick={()=>setMode(null)}>×</button>
        <div className="eyebrow">ARCHIVAGE RÉVERSIBLE</div>
        <h2>Archiver « {title} » ?</h2>
        <p>Ce livre disparaîtra de votre bibliothèque active. Ses chapitres, commentaires, révisions et versions resteront intacts et restaurables depuis les Archives.</p>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="button full" type="button" disabled={busy} onClick={()=>void commit('archive')}>
          {busy?'Archivage…':'Confirmer l’archivage'}
        </button>
        <button className="text-button" type="button" disabled={busy} onClick={()=>setMode(null)}>Annuler</button>
      </div>}
    </div>}
  </>;
}
