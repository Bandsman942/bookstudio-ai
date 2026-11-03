'use client';

import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import ActionMenu from './ActionMenu';
import {useAppPreferences} from './AppPreferences';

type Version={id:string;name:string;createdAt:string;chapterCount:number;integrityHash:string};
type Chapter={id:string;revision:number};

export default function SnapshotsPanel({bookId,editable}:{bookId:string;editable:boolean}){
  const {t,locale}=useAppPreferences();
  const [versions,setVersions]=useState<Version[]>([]);
  const [name,setName]=useState('');
  const [busy,setBusy]=useState(false);
  const [pendingRestore,setPendingRestore]=useState<Version|null>(null);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const router=useRouter();
  const refresh=useCallback(async()=>{
    const response=await fetch('/api/v1/books/'+bookId+'/snapshots',{cache:'no-store'});
    if(!response.ok)throw new Error(t('snapshot.unavailable'));
    const payload=await response.json();
    setVersions(payload.snapshots);
  },[bookId]);
  useEffect(()=>{refresh().catch(()=>setError(t('snapshot.loadError')));},[refresh]);
  useEffect(()=>{
    if(!pendingRestore||busy)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setPendingRestore(null);};
    document.addEventListener('keydown',escape);
    return ()=>document.removeEventListener('keydown',escape);
  },[pendingRestore,busy]);


  async function create(event:React.FormEvent){
    event.preventDefault();
    if(!editable||!name.trim())return;
    setBusy(true);setError('');setMessage('');
    try{
      const response=await fetch('/api/v1/books/'+bookId+'/snapshots',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:name.trim()})
      });
      const payload=await response.json();
      if(!response.ok){setError(payload.error||t('snapshot.createError'));return;}
      setName('');setMessage(t('snapshot.created'));
      await refresh();
    }catch{setError(t('snapshot.connectionError'));}
    finally{setBusy(false);}
  }

  async function restore(version:Version){
    if(!editable||busy)return;
    setBusy(true);setError('');setMessage('');
    try{
      const current=await fetch('/api/v1/books/'+bookId+'/chapters',{cache:'no-store'});
      if(!current.ok)throw new Error(t('snapshot.verifyError'));
      const manifest=await current.json();
      const expectedRevisions:Record<string,number>={};
      for(const chapter of manifest.chapters as Chapter[])expectedRevisions[chapter.id]=chapter.revision;
      const response=await fetch('/api/v1/books/'+bookId+'/snapshots/'+version.id+'/restore',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({confirm:'RESTORE',expectedRevisions})
      });
      const payload=await response.json();
      if(!response.ok){
        setError(response.status===409?t('snapshot.conflict'):(payload.error||t('snapshot.restoreError')));
        return;
      }
      setPendingRestore(null);
      setMessage(t('snapshot.restored',{count:payload.restored}));
      router.refresh();
    }catch(err){setError(err instanceof Error?err.message:t('snapshot.restoreInterrupted'));}
    finally{setBusy(false);}
  }

  return <section className="versions-section" aria-label={t('book.versions')}>
    <div className="section-header"><h2>{t('book.versions')}</h2>
      <span>{t('snapshot.count',{count:versions.length})}</span>
    </div>
    <p className="versions-help">{t('snapshot.intro')}</p>
    {editable&&<form className="versions-create" onSubmit={create}>
      <label htmlFor="snapshot-name" className="sr-only">{t('snapshot.name')}</label>
      <input id="snapshot-name" required minLength={2} maxLength={140} value={name}
        onChange={event=>setName(event.target.value)} placeholder={t('snapshot.placeholder')}/>
      <button className="button small" type="submit" disabled={busy}>{busy?t('snapshot.creating'):'＋ '+t('snapshot.create')}</button>
    </form>}
    {error&&<div className="form-error" role="alert">{error}</div>}
    {message&&<p role="status" className="versions-success">{message}</p>}
    <div className="versions-list">
      {versions.length===0?<p className="versions-empty">{t('snapshot.none')}</p>:
        versions.map(version=><div className="version-row" key={version.id}>
          <div className="version-icon" aria-hidden="true">↺</div>
          <div className="version-details"><strong>{version.name}</strong>
            <small>{new Date(version.createdAt).toLocaleString(locale==='fr'?'fr-FR':'en-US')} · {t('snapshot.details',{count:version.chapterCount,hash:version.integrityHash.slice(0,10)})}</small>
          </div>
          <ActionMenu label={t('snapshot.for',{name:version.name})} disabled={busy} actions={[
            {label:t('snapshot.exportPdf'),href:'/api/v1/books/'+bookId+'/snapshots/'+version.id+'/export?format=pdf',group:t('snapshot.export')},
            {label:t('snapshot.exportDocx'),href:'/api/v1/books/'+bookId+'/snapshots/'+version.id+'/export?format=docx'},
            {label:t('snapshot.exportMarkdown'),href:'/api/v1/books/'+bookId+'/snapshots/'+version.id+'/export?format=md'},
            ...(editable?[{label:t('snapshot.restore'),separatorBefore:true,
              onSelect:()=>{setError('');setPendingRestore(version);}}]:[])
          ]}/>
        </div>)}
    </div>
    {pendingRestore&&<div className="modal-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target&&!busy)setPendingRestore(null);}}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t('snapshot.dialog')}>
        <button className="close" type="button" disabled={busy} aria-label={t('common.close')} onClick={()=>setPendingRestore(null)}>×</button>
        <div className="eyebrow">{t('snapshot.eyebrow')}</div>
        <h2>{t('snapshot.question',{name:pendingRestore.name})}</h2>
        <p>{t('snapshot.desc')}</p>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="button full" type="button" disabled={busy} onClick={()=>void restore(pendingRestore)}>
          {t(busy?'snapshot.restoring':'snapshot.confirm')}
        </button>
        <button className="text-button" type="button" disabled={busy} onClick={()=>setPendingRestore(null)}>{t('common.cancel')}</button>
      </div>
    </div>}
  </section>;
}
