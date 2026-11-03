'use client';

import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import ActionMenu from './ActionMenu';
import {useAppPreferences} from './AppPreferences';

type Props={
  bookId:string;chapterId:string;title:string;updatedAt:string;editable:boolean;
};

export default function ChapterActionsMenu({bookId,chapterId,title,updatedAt,editable}:Props){
  const {t}=useAppPreferences();
  const [renaming,setRenaming]=useState(false);
  const [desired,setDesired]=useState(title);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const router=useRouter();
  function close(){if(!busy){setRenaming(false);setError('');}}
  useEffect(()=>{
    if(!renaming||busy)return;
    const onEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setRenaming(false);};
    document.addEventListener('keydown',onEscape);
    return ()=>document.removeEventListener('keydown',onEscape);
  },[renaming,busy]);

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
        setError(response.status===409?t('chapter.renameConflict'):
          result.error||t('chapter.renameError'));
        return;
      }
      setRenaming(false);router.refresh();
    }catch{setError(t('chapter.connectionFailure'));}
    finally{setBusy(false);}
  }
  return <>
    <ActionMenu label={t('chapter.actionsFor',{title})} disabled={busy} actions={[
      {label:t('chapter.open'),href:'/books/'+bookId+'/chapters/'+chapterId},
      ...(editable?[{label:t('chapter.rename'),separatorBefore:true,onSelect:()=>{
        setError('');setDesired(title);setRenaming(true);
      }}]:[])
    ]}/>
    {renaming&&<div className="modal-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target)close();}}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={t('chapter.actionsFor',{title})}
        onSubmit={rename}>
        <button className="close" type="button" aria-label={t('common.close')} disabled={busy} onClick={close}>×</button>
        <div className="eyebrow">{t('chapter.section')}</div>
        <h2>{t('chapter.renameHeading')}</h2>
        <p>{t('chapter.renameDetails')}</p>
        <label>{t('book.newTitle')}<input autoFocus required minLength={2} maxLength={180} value={desired}
          onChange={event=>setDesired(event.target.value)}/></label>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="button full" type="submit" disabled={busy}>{t(busy?'book.saving':'book.saveTitle')}</button>
      </form>
    </div>}
  </>;
}
