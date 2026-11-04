'use client';

import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import ActionMenu from './ActionMenu';
import AppIcon from './AppIcon';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {explainActionError,type Operation} from '@/lib/notification-copy';

type Version={id:string;name:string;createdAt:string;chapterCount:number;integrityHash:string};
type Chapter={id:string;revision:number};
type ExportFormat='pdf'|'docx'|'md';
const exportText={
  fr:{
    sending:'Préparation et téléchargement du fichier…',
    error:'Exportation interrompue. Réessayez ou utilisez le format Word.',
    unsupported:'Un caractère rare n’est pas couvert par les polices PDF disponibles. Le fichier Word conserve ce texte.',
    large:'Ce livre dépasse la taille maximale de ce format.',
    corrupt:'Cette version du livre est incomplète ou son intégrité ne peut pas être vérifiée.',
    wrongFile:'Le serveur n’a pas retourné le document demandé.',
    success:'Fichier préparé. Vérifiez le dossier Téléchargements.'
  },
  en:{
    sending:'Preparing and downloading the file…',
    error:'Export failed. Please retry or use Word format.',
    unsupported:'A rare character is not covered by the available PDF fonts. The Word file preserves it.',
    large:'This book exceeds the file size limit.',
    corrupt:'This saved version is incomplete or its integrity cannot be verified.',
    wrongFile:'The server returned an unexpected file.',
    success:'Your file is ready. Check Downloads.'
  }
} as const;

export default function SnapshotsPanel({bookId,editable}:{bookId:string;editable:boolean}){
  const {t,locale}=useAppPreferences();
  const e=exportText[locale];
  const {notify}=useToast();
  function report(operation:Operation,title:string,status:number,body?:{error?:string;codepoints?:string;chapterNumber?:number|null}){
    const detail=explainActionError({locale,operation,status,code:body?.error,
      codepoints:body?.codepoints,chapterNumber:body?.chapterNumber});
    setError(detail);setMessage('');
    notify({tone:'error',title,detail,key:operation+'|'+title+'|'+status+'|'+String(body?.error)});
  }
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
  useEffect(()=>{refresh().catch(()=>report('snapshot-list',t('snapshot.loadError'),503));},[refresh]);
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
      if(!response.ok){report('snapshot-create',t('snapshot.createError'),response.status,payload);return;}
      setName('');setMessage(t('snapshot.created'));
      notify({tone:'success',title:locale==='fr'?'Version enregistrée':'Version saved',
        detail:locale==='fr'?'« '+name.trim()+' » est désormais disponible dans Versions & historique.':
          '“'+name.trim()+'” is now available in Version history.'});
      await refresh();
    }catch{report('snapshot-create',t('snapshot.createError'),0);}
    finally{setBusy(false);}
  }

  async function download(version:Version,format:ExportFormat){
    if(busy)return;
    setBusy(true);setError('');setMessage(e.sending);
    try{
      const url='/api/v1/books/'+bookId+'/snapshots/'+version.id+'/export?format='+format;
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});
      if(!response.ok){
        const payload=await response.json().catch(()=>({})) as {error?:string;codepoints?:string;chapterNumber?:number|null};
        report(format==='pdf'?'pdf':format==='docx'?'docx':'markdown',
          (locale==='fr'?'Export ':'Export ')+format.toUpperCase()+
            (locale==='fr'?' impossible : « ':' failed: “')+version.name+(locale==='fr'?' »':'”'),
          response.status,payload);
        return;
      }
      const expected=format==='pdf'?'application/pdf':format==='docx'?
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'text/markdown';
      if(!response.headers.get('content-type')?.startsWith(expected)){
        report(format==='pdf'?'pdf':format==='docx'?'docx':'markdown',
          locale==='fr'?'Fichier exporté invalide':'Invalid exported file',502);return;
      }
      const blob=await response.blob();
      if(blob.size===0){report(format==='pdf'?'pdf':format==='docx'?'docx':'markdown',
        locale==='fr'?'Document exporté vide':'Exported document is empty',502);return;}
      const objectUrl=URL.createObjectURL(blob);
      try{
        const anchor=document.createElement('a');
        anchor.href=objectUrl;
        anchor.download='bookstudio-'+version.id+'.'+format;
        anchor.hidden=true;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setMessage(e.success);
        notify({tone:'success',title:'Export '+format.toUpperCase()+
          (locale==='fr'?' préparé':' ready'),
          detail:locale==='fr'?'Le navigateur a reçu le téléchargement de « '+version.name+' ». Vérifiez le dossier Téléchargements.':
            'Your browser received the download for “'+version.name+'”. Check Downloads.'});
      }finally{
        // Some mobile browsers read blob URLs shortly after the click.
        window.setTimeout(()=>URL.revokeObjectURL(objectUrl),30000);
      }
    }catch{
      report(format==='pdf'?'pdf':format==='docx'?'docx':'markdown',
        locale==='fr'?'Téléchargement interrompu':'Download interrupted',0);
    }finally{setBusy(false);}
  }

  async function restore(version:Version){
    if(!editable||busy)return;
    setBusy(true);setError('');setMessage('');
    try{
      const current=await fetch('/api/v1/books/'+bookId+'/chapters',{cache:'no-store'});
      if(!current.ok){report('snapshot-restore',t('snapshot.verifyError'),current.status);return;}
      const manifest=await current.json();
      const expectedRevisions:Record<string,number>={};
      for(const chapter of manifest.chapters as Chapter[])expectedRevisions[chapter.id]=chapter.revision;
      const response=await fetch('/api/v1/books/'+bookId+'/snapshots/'+version.id+'/restore',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({confirm:'RESTORE',expectedRevisions})
      });
      const payload=await response.json();
      if(!response.ok){report('snapshot-restore',t('snapshot.restoreError'),response.status,payload);return;}
      setPendingRestore(null);
      setMessage(t('snapshot.restored',{count:payload.restored}));
      notify({tone:'success',title:locale==='fr'?'Version restaurée':'Version restored',
        detail:locale==='fr'?'« '+version.name+' » a restauré '+payload.restored+' chapitre(s). L’historique existant est conservé.':
          '“'+version.name+'” restored '+payload.restored+' chapter(s); earlier versions remain available.'});
      router.refresh();
    }catch{report('snapshot-restore',t('snapshot.restoreInterrupted'),0);}
    finally{setBusy(false);}
  }

  return <section id="book-versions" className="versions-section" aria-label={t('book.versions')}>
    <div className="section-header"><h2><AppIcon name="history"/>{t('book.versions')}</h2>
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
            {label:t('snapshot.exportPdf'),onSelect:()=>{void download(version,'pdf');},group:t('snapshot.export')},
            {label:t('snapshot.exportDocx'),onSelect:()=>{void download(version,'docx');}},
            {label:t('snapshot.exportMarkdown'),onSelect:()=>{void download(version,'md');}},
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
