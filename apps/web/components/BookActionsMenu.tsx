'use client';

import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createPortal} from 'react-dom';
import ActionMenu from './ActionMenu';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {explainActionError} from '@/lib/notification-copy';
import BookPropertiesDialog from './BookPropertiesDialog';

type Props={
  bookId:string;
  title:string;
  bookType:string;
  language:string;
  status:string;
  updatedAt:string;
  editable:boolean;
  showOpen?:boolean;
  onArchive?:'refresh'|'library';
};

/** Shared book commands. The same confirm dialogs serve book cards and detail. */
export default function BookActionsMenu({bookId,title,bookType,language,status,updatedAt,editable,showOpen=false,onArchive='library'}:Props){
  const {t,locale}=useAppPreferences();
  const {notify}=useToast();
  const [mode,setMode]=useState<'rename'|'archive'|'properties'|'status'|'duplicate'|null>(null);
  const [desired,setDesired]=useState(title);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const router=useRouter();
  const duplicateOperationRef=useRef<string|null>(null);
  useEffect(()=>{
    if(!mode)return;
    // A fixed dialog must be outside transformed/clipped book cards. Lock
    // background scrolling while the portal is visible, preserving prior state.
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=previous;};
  },[mode]);
  useEffect(()=>{
    if(!mode)return;
    function esc(event:globalThis.KeyboardEvent){if(event.key==='Escape'&&!busy)setMode(null);}
    document.addEventListener('keydown',esc);
    return ()=>document.removeEventListener('keydown',esc);
  },[mode,busy]);

  function open(mode:'rename'|'archive'|'properties'|'status'|'duplicate'){
    setError('');
    if(mode==='duplicate'){
      setDesired((locale==='fr'?'Copie de ':'Copy of ')+title.slice(0,140));
      duplicateOperationRef.current=crypto.randomUUID();
    }else setDesired(title);
    setMode(mode);
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
        const msg=explainActionError({locale,operation:action==='rename'?'book-rename':'book-archive',status:response.status,code:payload.error});
        setError(msg);
        notify({tone:response.status===409?'warning':'error',
          title:locale==='fr'?(action==='rename'?'Renommage du livre refusé':'Archivage refusé'):
            (action==='rename'?'Book rename refused':'Archive request refused'),
          detail:msg});return;
      }
      setMode(null);
      notify({tone:'success',title:locale==='fr'?(action==='rename'?'Livre renommé':'Livre archivé'):
        (action==='rename'?'Book renamed':'Book archived'),
        detail:locale==='fr'?'« '+title+' » : '+(action==='rename'?'le nouveau titre « '+desired+' » est enregistré.':'le livre reste disponible dans les archives.'):
          '“'+title+'”: '+(action==='rename'?'renamed to “'+desired+'”.':'the book remains accessible in Archives.')});
      if(action==='archive'&&onArchive==='library')router.push('/library');
      router.refresh();
    }catch{
      const msg=explainActionError({locale,operation:action==='rename'?'book-rename':'book-archive',status:0});setError(msg);
      notify({tone:'error',title:locale==='fr'?'Modification du livre interrompue':'Book update interrupted',detail:msg});
    }finally{setBusy(false);}
  }


  async function duplicateBook(event:React.FormEvent){
    event.preventDefault();if(busy)return;
    const operationId=duplicateOperationRef.current;
    if(!operationId)return;
    setBusy(true);setError('');
    try{
      // Current edition/optimistic clock are re-fetched at the confirmation
      // boundary. Server rechecks the same values under a book-row lock.
      const editionResponse=await fetch('/api/v1/books/'+bookId+'/editions',
        {cache:'no-store'});
      const editionBody=await editionResponse.json().catch(()=>({})) as {
        currentEditionId?:string;expectedUpdatedAt?:string;error?:string};
      if(!editionResponse.ok||!editionBody.currentEditionId||
         !editionBody.expectedUpdatedAt){
        const detail=explainActionError({locale,operation:'book-duplicate',
          status:editionResponse.status,code:editionBody.error});
        setError(detail);notify({tone:'error',
          title:locale==='fr'?'Copie du livre indisponible':'Cannot duplicate book',detail});return;
      }
      const response=await fetch('/api/v1/books/'+bookId+'/duplicate',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({confirm:'DUPLICATE_BOOK_FROM_SAVED_EDITION',
          title:desired,operationId,
          expectedEditionId:editionBody.currentEditionId,
          expectedUpdatedAt:editionBody.expectedUpdatedAt})
      });
      const data=await response.json().catch(()=>({})) as {
        error?:string;book?:{id:string;title:string;chapterCount?:number};
        replayed?:boolean};
      if(!response.ok||!data.book?.id){
        const detail=explainActionError({locale,operation:'book-duplicate',
          status:response.status,code:data.error});
        setError(detail);
        notify({tone:response.status===409?'warning':'error',
          title:locale==='fr'?'Copie du livre refusée':'Book duplication refused',detail});
        return;
      }
      const name=data.book.title;
      setMode(null);
      notify({tone:'success',
        title:locale==='fr'?'Livre dupliqué':'Book duplicated',
        detail:locale==='fr'?
          '« '+name+' » est un nouvel ouvrage indépendant, en brouillon, avec uniquement les chapitres enregistrés. Les sources, commentaires, versions et scans ne sont pas copiés.':
          '“'+name+'” is a new independent draft book with saved chapters only. Sources, comments, snapshots and scans were not copied.'});
      router.push('/books/'+data.book.id);
      router.refresh();
    }catch{
      const detail=locale==='fr'?
        'La connexion a été interrompue. Vérifiez la bibliothèque avant une nouvelle tentative : la même opération sera reconnue sans créer de deuxième livre.':
        'The connection dropped. Check your library before retrying: the same operation is recognized without creating a second book.';
      setError(detail);
      notify({tone:'error',title:locale==='fr'?'Copie à vérifier':'Check duplication result',detail});
    }finally{setBusy(false);}
  }

  const actions=[
    ...(showOpen?[{label:t('book.openBook'),href:'/books/'+bookId}]:[]),
    ...(editable?[
      {label:t('common.rename'),onSelect:()=>open('rename'),separatorBefore:showOpen},
      {label:locale==='fr'?'Dupliquer le livre…':'Duplicate book…',
        onSelect:()=>open('duplicate')},
      {label:locale==='fr'?'Modifier les propriétés…':'Edit book properties…',
        onSelect:()=>open('properties')},
      {label:locale==='fr'?'Faire évoluer le statut éditorial…':'Change editorial status…',
        onSelect:()=>open('status'),disabled:status==='PUBLISHED'},
      {label:t('book.archiveEllipsis'),onSelect:()=>open('archive'),destructive:true},
    ]:[])
  ];
  return <>
    <ActionMenu label={t('book.actionsFor',{title})} actions={actions} disabled={busy}/>
    {mode&&typeof document!=='undefined'&&createPortal(<>
    {(mode==='rename'||mode==='archive'||mode==='duplicate')&&<div className="modal-backdrop book-actions-overlay" onMouseDown={event=>{if(event.currentTarget===event.target&&!busy)setMode(null);}}>
      {mode==='duplicate'?<form className="modal" onSubmit={event=>void duplicateBook(event)}
        role="dialog" aria-modal="true"
        aria-label={locale==='fr'?'Dupliquer un ouvrage':'Duplicate book'}>
        <button className="close" type="button" disabled={busy}
          onClick={()=>setMode(null)} aria-label={t('common.close')}>×</button>
        <div className="eyebrow">{locale==='fr'?'Nouvel ouvrage indépendant':'Independent new book'}</div>
        <h2>{locale==='fr'?'Dupliquer « '+title+' »':'Duplicate “'+title+'”'}</h2>
        <p className="source-note">{locale==='fr'?
          'La copie reprend uniquement les chapitres actifs et leur dernière révision enregistrée dans l’édition courante. Votre livre initial reste inchangé. Les fichiers sources, commentaires, snapshots et attestations antivirus ne seront pas transférés. Les membres du même espace conservent leurs droits habituels d'accès au nouveau livre. Enregistrez d’abord vos brouillons ouverts.':
          'Only active chapters and their latest saved revisions in the current edition are copied. Your original book remains unchanged. Source files, comments, snapshots and antivirus attestations are never transferred. Existing members of the same workspace retain their regular access rights to the new book. Save open drafts first.'}</p>
        <label>{locale==='fr'?'Titre du nouveau livre':'New book title'}
          <input required minLength={2} maxLength={180} autoFocus
            value={desired} onChange={event=>setDesired(event.target.value)}/></label>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className="button full">
          {busy?(locale==='fr'?'Duplication en cours…':'Duplicating…'):
            (locale==='fr'?'Créer la copie indépendante':'Create independent copy')}</button>
        <button type="button" className="text-button" disabled={busy}
          onClick={()=>setMode(null)}>{t('common.cancel')}</button>
      </form>:mode==='rename'?<form className="modal" onSubmit={event=>{event.preventDefault();void commit('rename');}}
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
    {(mode==='properties'||mode==='status')&&
      <BookPropertiesDialog mode={mode} bookId={bookId} title={title}
        bookType={bookType} language={language} status={status}
        updatedAt={updatedAt} onClose={()=>setMode(null)}/>}
    </>,document.body)}
  </>;
}
