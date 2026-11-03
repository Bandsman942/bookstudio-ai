'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import ActionMenu from './ActionMenu';

type Props={
  bookId:string;chapterId:string;title:string;updatedAt:string;editable:boolean;
};

export default function ChapterActionsMenu({bookId,chapterId,title,updatedAt,editable}:Props){
  const [renaming,setRenaming]=useState(false);
  const [desired,setDesired]=useState(title);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const router=useRouter();
  function close(){if(!busy){setRenaming(false);setError('');}}
  async function rename(event:React.FormEvent){
    event.preventDefault();if(!editable||busy)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/v1/books/'+bookId+'/chapters/'+chapterId+'/metadata',{
        method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({title:desired,expectedUpdatedAt:updatedAt})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok){
        setError(response.status===409?'Le chapitre a été modifié dans un autre onglet. Rechargez la page avant de recommencer.':
          result.error||'Renommage impossible.');
        return;
      }
      setRenaming(false);router.refresh();
    }catch{setError('Connexion interrompue : modification non confirmée.');}
    finally{setBusy(false);}
  }
  return <>
    <ActionMenu label={'Actions pour le chapitre « '+title+' »'} disabled={busy} actions={[
      {label:'Ouvrir le chapitre',href:'/books/'+bookId+'/chapters/'+chapterId},
      ...(editable?[{label:'Renommer le chapitre…',separatorBefore:true,onSelect:()=>{
        setError('');setDesired(title);setRenaming(true);
      }}]:[])
    ]}/>
    {renaming&&<div className="modal-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target)close();}}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={'Renommer le chapitre « '+title+' »'}
        onSubmit={rename}>
        <button className="close" type="button" aria-label="Fermer" disabled={busy} onClick={close}>×</button>
        <div className="eyebrow">STRUCTURE DU MANUSCRIT</div>
        <h2>Renommer le chapitre</h2>
        <p>Le titre change sans modifier le texte, les révisions ni les versions enregistrées.</p>
        <label>Nouveau titre<input autoFocus required minLength={2} maxLength={180} value={desired}
          onChange={event=>setDesired(event.target.value)}/></label>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="button full" type="submit" disabled={busy}>{busy?'Enregistrement…':'Enregistrer le titre'}</button>
      </form>
    </div>}
  </>;
}
