'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';

type Entry={sequence:number;createdAt:string;authorName:string};
type Inventory={currentRevision:number;revisions:Entry[];nextBefore:number|null;error?:string};
type Preview={revision:{sequence:number;recordedAt:string;authorName:string;text:string;isCurrent:boolean}};
type Props={bookId:string;chapterId:string;canEdit:boolean;getCurrentRevision:()=>number;
 canRestoreNow:()=>boolean;onRestored:()=>void};

export default function ChapterRevisionsPanel({bookId,chapterId,canEdit,
 getCurrentRevision,canRestoreNow,onRestored}:Props){
 const {locale}=useAppPreferences(),{notify}=useToast(),fr=locale==='fr';
 const [open,setOpen]=useState(false),[mounted,setMounted]=useState(false);
 const [entries,setEntries]=useState<Entry[]>([]),[before,setBefore]=useState<number|null>(null);
 const [current,setCurrent]=useState(0),[loading,setLoading]=useState(false);
 const [preview,setPreview]=useState<Preview['revision']|null>(null);
 const [viewLoading,setViewLoading]=useState(false);
 const [confirm,setConfirm]=useState<number|null>(null),[busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const closeRef=useRef<HTMLButtonElement>(null);
 const triggerRef=useRef<HTMLButtonElement>(null);
 const wasOpen=useRef(false);
 const base='/api/v1/books/'+bookId+'/chapters/'+chapterId+'/revisions';
 useEffect(()=>setMounted(true),[]);
 const load=useCallback(async(cursor:number|null)=>{
   setLoading(true);setError('');
   try{
     const res=await fetch(base+'?limit=20'+(cursor===null?'':'&before='+cursor),
       {cache:'no-store'});
     const payload=await res.json().catch(()=>null) as Inventory|null;
     if(!res.ok||!payload||!Array.isArray(payload.revisions))
       throw new Error('HISTORY_UNAVAILABLE');
     setEntries(old=>cursor===null?payload.revisions:
       [...old,...payload.revisions.filter(v=>!old.some(o=>o.sequence===v.sequence))]);
     setCurrent(payload.currentRevision);setBefore(payload.nextBefore);
   }catch{
     setError(fr?'Impossible de consulter les révisions enregistrées de ce chapitre.':
       'Could not read this chapter’s saved revisions.');
   }finally{setLoading(false);}
 },[base,fr]);
 useEffect(()=>{
   if(!open)return;
   setEntries([]);setBefore(null);setPreview(null);setConfirm(null);setError('');
   void load(null);
 },[open,load]);
 useEffect(()=>{
   if(open){
     wasOpen.current=true;closeRef.current?.focus();
   }else if(wasOpen.current){
     wasOpen.current=false;triggerRef.current?.focus();
   }
 },[open]);
 useEffect(()=>{
   if(!open)return;
   const handle=(event:KeyboardEvent)=>{
     if(event.key==='Escape'&&!busy){event.preventDefault();setOpen(false);return;}
     if(event.key!=='Tab')return;
     const dialog=closeRef.current?.closest('[role="dialog"]');
     const active=[...(dialog?.querySelectorAll<HTMLElement>(
       'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])'
     )??[])].filter(item=>item.getClientRects().length>0);
     const first=active[0],last=active[active.length-1];
     if(!first||!last)return;
     if(event.shiftKey&&document.activeElement===first){
       event.preventDefault();last.focus();
     }else if(!event.shiftKey&&document.activeElement===last){
       event.preventDefault();first.focus();
     }
   };
   document.addEventListener('keydown',handle);
   return()=>document.removeEventListener('keydown',handle);
 },[open,busy]);
 async function showRevision(sequence:number){
   if(loading||viewLoading||busy)return;
   setPreview(null);setConfirm(null);setError('');setViewLoading(true);
   try{
     const res=await fetch(base+'/'+sequence,{cache:'no-store'});
     const payload=await res.json().catch(()=>null) as Preview|null;
     if(!res.ok||!payload?.revision)throw Error('REVISION_UNAVAILABLE');
     setPreview(payload.revision);
   }catch{
     setError(fr?'Le texte de cette révision ne peut pas être ouvert.':
       'The text of this saved revision could not be opened.');
   }finally{setViewLoading(false);}
 }
 function chooseRestore(sequence:number){
   if(!canEdit)return;
   if(!canRestoreNow()){
     notify({tone:'warning',title:fr?'Restauration bloquée':'Restore blocked',
       detail:fr?'Enregistrez d’abord le brouillon local et résolvez tout conflit avant de restaurer une ancienne révision.':
         'Save the local draft and resolve any conflict before restoring an older revision.'});
     return;
   }
   setConfirm(sequence);setError('');
 }
 async function restore(){
   if(confirm===null||busy||!canEdit)return;
   if(!canRestoreNow()){
     chooseRestore(confirm);return;
   }
   setBusy(true);setError('');
   try{
     const res=await fetch(base+'/'+confirm,{method:'POST',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({confirm:'RESTORE_CHAPTER_REVISION',
         expectedRevision:getCurrentRevision()})});
     const data=await res.json().catch(()=>({})) as {error?:string;revision?:number};
     if(!res.ok){
       const detail=res.status===409?
         (fr?'Le chapitre a été modifié ailleurs ou cette version est invalide. Actualisez le chapitre et son historique.':
           'The chapter changed elsewhere or this revision is invalid. Refresh the chapter and its history.'):
         res.status===422?
         (fr?'Cette version est déjà courante. Choisissez une révision plus ancienne.':
           'This is already the current version. Choose an earlier revision.'):
         res.status===404?
         (fr?'Ce chapitre n’est plus accessible dans l’édition courante.':
           'This chapter is no longer available in the current edition.'):
         (fr?'La restauration a été refusée. Aucune ancienne révision n’a été écrasée.':
           'Restoration was refused. No older revision was overwritten.');
       setError(detail);
       notify({tone:res.status===409?'warning':'error',
         title:fr?'Révision non restaurée':'Revision not restored',detail});
       return;
     }
     setOpen(false);
     notify({tone:'success',title:fr?'Révision restaurée':'Revision restored',
       detail:fr?'Une nouvelle révision '+data.revision+
         ' contient le texte historique sélectionné. Les versions antérieures sont conservées et le livre revient à Brouillon.':
         'New revision '+data.revision+
         ' contains the selected historical text. Earlier versions remain intact; the book returns to Draft.'});
     onRestored();
   }catch{
     const detail=fr?'Connexion interrompue. Vérifiez la dernière révision enregistrée avant de recommencer.':
       'Connection interrupted. Check the latest saved revision before trying again.';
     setError(detail);notify({tone:'error',
       title:fr?'Restauration interrompue':'Restoration interrupted',detail});
   }finally{setBusy(false);}
 }
 const formatDate=(date:string)=>new Intl.DateTimeFormat(fr?'fr-FR':'en-US',
   {dateStyle:'medium',timeStyle:'short'}).format(new Date(date));
 return <>
   <button ref={triggerRef} type="button" className="studio-history-trigger"
     onClick={()=>setOpen(true)} aria-haspopup="dialog"
     aria-label={fr?'Historique des révisions du chapitre':'Chapter revision history'}>
     {fr?'Historique':'History'}
   </button>
   {mounted&&open&&createPortal(
     <div className="modal-backdrop" onMouseDown={event=>{
       if(event.target===event.currentTarget&&!busy)setOpen(false);
     }}>
       <div className="modal chapter-history-modal" role="dialog" aria-modal="true"
         aria-label={fr?'Historique des révisions':'Revision history'}>
         <button ref={closeRef} type="button" className="close" disabled={busy}
           onClick={()=>setOpen(false)}
           aria-label={fr?'Fermer l’historique':'Close history'}>×</button>
         <div className="eyebrow">{fr?'Édition courante':'Current edition'}</div>
         <h2>{fr?'Historique du chapitre':'Chapter history'}</h2>
         <p className="source-note">{fr?
           'Chaque révision enregistrée est conservée. L’aperçu est en lecture seule ; restaurer crée une nouvelle révision et n’efface aucune version précédente.':
           'Every saved revision is preserved. Preview is read-only; restore creates a new revision without deleting earlier versions.'}</p>
         {error&&<p className="form-error" role="alert">{error}</p>}
         <div className="chapter-history-layout">
           <div className="chapter-history-list" aria-label={fr?'Révisions enregistrées':'Saved revisions'}>
             {entries.map(entry=><button key={entry.sequence} type="button"
               className={'chapter-history-item '+(preview?.sequence===entry.sequence?'selected':'')}
               disabled={loading||viewLoading||busy} onClick={()=>void showRevision(entry.sequence)}>
               <strong>{fr?'Révision':'Revision'} {entry.sequence}</strong>
               {entry.sequence===current&&<span className="badge success">{fr?'Courante':'Current'}</span>}
               <small>{formatDate(entry.createdAt)}</small>
               <small>{entry.authorName}</small>
             </button>)}
             {entries.length===0&&!loading&&<p className="source-note">
               {fr?'Aucune révision disponible.':'No saved revisions available.'}</p>}
             {loading&&<p role="status">{fr?'Chargement…':'Loading…'}</p>}
             {before!==null&&<button type="button" className="text-button"
               disabled={loading||busy} onClick={()=>void load(before)}>
               {fr?'Charger les révisions précédentes':'Load earlier revisions'}</button>}
           </div>
           <div className="chapter-history-preview">
             {viewLoading&&<p role="status">{fr?'Ouverture du texte…':'Opening saved text…'}</p>}
             {!preview&&!viewLoading&&<p className="source-note">
               {fr?'Sélectionnez une révision pour lire le texte qui avait été enregistré.':
                 'Select a revision to read its previously saved text.'}</p>}
             {preview&&<div>
               <h3>{fr?'Révision':'Revision'} {preview.sequence}</h3>
               <p className="source-note">{preview.authorName} · {formatDate(preview.recordedAt)}</p>
               <pre className="chapter-history-text">{preview.text||
                 (fr?'Ce chapitre était vide.':'This chapter was empty.')}</pre>
               {canEdit&&!preview.isCurrent&&<button type="button" className="button small"
                 disabled={busy} onClick={()=>chooseRestore(preview.sequence)}>
                 {fr?'Restaurer cette révision':'Restore this revision'}</button>}
               {preview.isCurrent&&<span className="badge success">
                 {fr?'Version actuelle':'Current saved revision'}</span>}
             </div>}
           </div>
         </div>
         {confirm!==null&&<div className="chapter-history-confirm" role="group"
           aria-label={fr?'Confirmation de restauration':'Restore confirmation'}>
           <strong>{fr?'Confirmer la restauration de la révision '+confirm+' ?':
             'Restore revision '+confirm+'?'}</strong>
           <p>{fr?
             'Cette opération ajoute une nouvelle révision au chapitre courant et remet le statut du livre à Brouillon. Vos révisions précédentes restent disponibles. Les modifications locales non enregistrées doivent d’abord être sauvegardées.':
             'A new revision will be added to the current chapter and book status will return to Draft. Older revisions remain available. Save any local unsaved edits first.'}</p>
           <button type="button" className="button" disabled={busy}
             onClick={()=>void restore()}>
             {busy?(fr?'Restauration en cours…':'Restoring…'):
               (fr?'Confirmer la restauration':'Confirm restoration')}</button>
           <button type="button" className="text-button" disabled={busy}
             onClick={()=>setConfirm(null)}>{fr?'Annuler':'Cancel'}</button>
         </div>}
       </div>
     </div>,document.body)}
 </>;
}
