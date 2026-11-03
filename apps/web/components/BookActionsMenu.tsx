'use client';

import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import ActionMenu from './ActionMenu';
import {useAppPreferences} from './AppPreferences';

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
  const {t}=useAppPreferences();
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
          ?t('book.renameConflict')
          :payload.error||t('book.changeFailed'));
        return;
      }
      setMode(null);
      if(action==='archive'&&onArchive==='library')router.push('/library');
      router.refresh();
    }catch{
      setError(t('book.connectionFailure'));
    }finally{setBusy(false);}
  }

  const actions=[
    ...(showOpen?[{label:t('book.openBook'),href:'/books/'+bookId}]:[]),
    ...(editable?[
      {label:t('common.rename'),onSelect:()=>open('rename'),separatorBefore:showOpen},
      {label:t('book.archiveEllipsis'),onSelect:()=>open('archive'),destructive:true},
    ]:[])
  ];
  return <>
    <ActionMenu label={t('book.actionsFor',{title})} actions={actions} disabled={busy}/>
    {mode&&<div className="modal-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target&&!busy)setMode(null);}}>
      {mode==='rename'?<form className="modal" onSubmit={event=>{event.preventDefault();void commit('rename');}}
        role="dialog" aria-modal="true" aria-label={t('book.rename')}>
        <button className="close" type="button" aria-label={t('common.close')} disabled={busy} onClick={()=>setMode(null)}>×</button>
        <div className="eyebrow">{t('book.management')}</div><h2>{t('book.rename')}</h2>
        <label>{t('book.newTitle')}<input autoFocus required minLength={2} maxLength={180}
          value={desired} onChange={event=>setDesired(event.target.value)}/></label>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="button full" type="submit" disabled={busy}>{t(busy?'book.saving':'book.saveTitle')}</button>
      </form>:<div className="modal" role="dialog" aria-modal="true"
        aria-label={t('book.confirmArchive')}>
        <button className="close" type="button" aria-label="Fermer" disabled={busy} onClick={()=>setMode(null)}>×</button>
        <div className="eyebrow">{t('book.archiveReversible')}</div>
        <h2>{t('book.archiveQuestion',{title})}</h2>
        <p>{t('book.archiveDetails')}</p>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="button full" type="button" disabled={busy} onClick={()=>void commit('archive')}>
          {t(busy?'book.archiving':'book.archiveApprove')}
        </button>
        <button className="text-button" type="button" disabled={busy} onClick={()=>setMode(null)}>{t('common.cancel')}</button>
      </div>}
    </div>}
  </>;
}
