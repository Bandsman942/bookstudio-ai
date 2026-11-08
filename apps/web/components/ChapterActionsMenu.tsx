'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname,useRouter} from 'next/navigation';
import ActionMenu from './ActionMenu';
import ChapterCopyToBookDialog from './ChapterCopyToBookDialog';
import ChapterMergeDialog from './ChapterMergeDialog';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {explainActionError} from '@/lib/notification-copy';

type Props={bookId:string;chapterId:string;title:string;updatedAt:string;revision:number;editable:boolean;beforeNavigate?:()=>boolean;
 reorder?:{token:string;index:number;total:number}};

export default function ChapterActionsMenu({bookId,chapterId,title,updatedAt,revision,editable,beforeNavigate,reorder}:Props){
 const {t,locale}=useAppPreferences(),{notify}=useToast();
 const [mode,setMode]=useState<'create'|'rename'|'delete'|'duplicate'|'copy-book'|'merge'|null>(null);
 const [desired,setDesired]=useState(title),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const router=useRouter(),pathname=usePathname();
 const duplicateOperationRef=useRef<string|null>(null);
 const endpoint='/api/v1/books/'+bookId+'/chapters/'+chapterId;
 function close(){if(!busy){setMode(null);setError('');}}
 useEffect(()=>{
   if(!mode||busy)return;
   const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setMode(null);};
   document.addEventListener('keydown',key);return ()=>document.removeEventListener('keydown',key);
 },[mode,busy]);
 async function submit(event:React.FormEvent){
   event.preventDefault();if(!editable||busy||!mode)return;
   if((mode==='create'||mode==='delete')&&beforeNavigate?.()===false)return;
   setBusy(true);setError('');
   const deleting=mode==='delete',creating=mode==='create';
   const verb=deleting?'chapter-delete':creating?'chapter-create':'chapter-rename';
   try{
     const response=await fetch(creating?'/api/v1/books/'+bookId+'/chapters':deleting?endpoint:endpoint+'/metadata',{
       method:creating?'POST':deleting?'DELETE':'PATCH',headers:{'Content-Type':'application/json'},
       body:JSON.stringify(creating?{title:desired}:deleting?{
         confirm:'DELETE',expectedRevision:revision,expectedUpdatedAt:updatedAt
       }:{title:desired,expectedUpdatedAt:updatedAt})
     });
     const payload=await response.json().catch(()=>({}));
     if(!response.ok){
       const msg=explainActionError({locale,operation:verb,status:response.status,code:payload.error});
       setError(msg);notify({tone:response.status===409?'warning':'error',
         title:locale==='fr'?(deleting?'Suppression du chapitre refusée':creating?'Création du chapitre refusée':'Renommage refusé'):
           (deleting?'Chapter removal refused':creating?'Chapter creation refused':'Rename refused'),detail:msg});return;
     }
     setMode(null);
     notify({tone:'success',
       title:locale==='fr'?(deleting?'Chapitre retiré du manuscrit':creating?'Chapitre créé':'Chapitre renommé'):
         (deleting?'Chapter removed from manuscript':creating?'Chapter created':'Chapter renamed'),
       detail:locale==='fr'?(deleting?'« '+title+' » reste conservé avec son historique et peut être restauré depuis la vue d’ensemble.':
         creating?'« '+desired+' » a été ajouté au manuscrit.':
         '« '+title+' » est désormais intitulé « '+desired+' ».'):
         (deleting?'“'+title+'” is preserved with its revision history and can be restored from the overview.':
           creating?'“'+desired+'” was added to the manuscript.':
           '“'+title+'” is now named “'+desired+'”.')});
     if(creating&&payload.chapter?.id){
       router.push('/books/'+bookId+'/chapters/'+payload.chapter.id);
     }else if(deleting&&pathname===('/books/'+bookId+'/chapters/'+chapterId)){
       router.replace('/books/'+bookId);
     }else router.refresh();
   }catch{
     const msg=explainActionError({locale,operation:verb,status:0});setError(msg);
     notify({tone:'error',title:locale==='fr'?'Action sur le chapitre interrompue':'Chapter action interrupted',detail:msg});
   }finally{setBusy(false);}
 }
 async function move(direction:'up'|'down'){
   if(!editable||busy||!reorder||beforeNavigate?.()===false)return;
   setBusy(true);setError('');
   try{
     const response=await fetch('/api/v1/books/'+bookId+'/chapters/reorder',{
       method:'PATCH',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({chapterId,direction,expectedOrderToken:reorder.token})
     });
     const result=await response.json().catch(()=>({})) as {error?:string};
     if(!response.ok){
       const detail=explainActionError({locale,operation:'chapter-reorder',
         status:response.status,code:result.error});
       notify({tone:response.status===409?'warning':'error',
         title:locale==='fr'?'Réorganisation du chapitre refusée':'Chapter reorder refused',
         detail});return;
     }
     notify({tone:'success',title:locale==='fr'?'Chapitre déplacé':'Chapter moved',
       detail:locale==='fr'?'« '+title+' » a été déplacé '+(direction==='up'?'vers le haut.':'vers le bas.')+
           ' Son texte et ses révisions restent intacts.':
         '“'+title+'” moved '+(direction==='up'?'up.':'down.')+' Its content and revisions are unchanged.'});
     router.refresh();
   }catch{
     const detail=explainActionError({locale,operation:'chapter-reorder',status:0});
     notify({tone:'error',title:locale==='fr'?'Déplacement interrompu':'Move interrupted',detail});
   }finally{setBusy(false);}
 }
 async function duplicateChapter(event:React.FormEvent){
   event.preventDefault();
   if(!editable||busy||beforeNavigate?.()===false)return;
   const operationId=duplicateOperationRef.current;
   if(!operationId)return;
   setBusy(true);setError('');
   try{
     // The editor sidebar may hold initial revision metadata while autosave
     // advances the chapter. Fetch latest SERVER metadata just before POST,
     // while the API still revalidates everything under the book-row lock.
     const [metadataResponse,chaptersResponse]=await Promise.all([
       fetch('/api/v1/books/'+bookId+'/editions',{cache:'no-store'}),
       fetch('/api/v1/books/'+bookId+'/chapters',{cache:'no-store'})
     ]);
     const metadata=await metadataResponse.json().catch(()=>({})) as {
       currentEditionId?:string;error?:string};
     const chaptersResult=await chaptersResponse.json().catch(()=>({})) as {
       chapters?:{id:string;revision:number;updatedAt:string}[];error?:string};
     const liveChapter=chaptersResult.chapters?.find(c=>c.id===chapterId);
     if(!metadataResponse.ok||!metadata.currentEditionId||
        !chaptersResponse.ok||!liveChapter){
       const status=!metadataResponse.ok?metadataResponse.status:
         !chaptersResponse.ok?chaptersResponse.status:404;
       const msg=explainActionError({locale,operation:'chapter-duplicate',
         status,code:metadata.error||chaptersResult.error});
       setError(msg);
       notify({tone:'error',title:locale==='fr'?'Copie du chapitre indisponible':
         'Chapter duplication unavailable',detail:msg});return;
     }
     const response=await fetch(endpoint+'/duplicate',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({
         confirm:'DUPLICATE_CHAPTER_FROM_SAVED',
         operationId,title:desired,
         expectedEditionId:metadata.currentEditionId,
         expectedRevision:liveChapter.revision,
         expectedChapterUpdatedAt:liveChapter.updatedAt
       })
     });
     const body=await response.json().catch(()=>({})) as {
       chapter?:{id:string;title:string};error?:string;replayed?:boolean};
     if(!response.ok||!body.chapter?.id){
       const msg=explainActionError({locale,operation:'chapter-duplicate',
         status:response.status,code:body.error});
       setError(msg);
       notify({tone:response.status===409?'warning':'error',
         title:locale==='fr'?'Duplication du chapitre refusée':
           'Chapter duplication refused',detail:msg});return;
     }
     setMode(null);
     notify({tone:'success',
       title:locale==='fr'?'Chapitre dupliqué':'Chapter duplicated',
       detail:locale==='fr'?
         '« '+body.chapter.title+' » a été ajouté à la fin du manuscrit avec le dernier texte enregistré. Les commentaires, sources et révisions de « '+title+' » restent dans le chapitre d’origine. Le livre revient à Brouillon.':
         '“'+body.chapter.title+'” was appended with the latest saved text. Comments, sources and revisions remain on “'+title+'”. The book returns to Draft.'});
     router.push('/books/'+bookId+'/chapters/'+body.chapter.id);
     router.refresh();
   }catch{
     const msg=locale==='fr'?
       'Connexion interrompue. Vérifiez la liste des chapitres avant de recommencer ; la même opération permet de retrouver une copie déjà créée.':
       'Connection interrupted. Check the chapter list before retrying; repeating the same operation retrieves an existing copy.';
     setError(msg);
     notify({tone:'error',title:locale==='fr'?'Copie à vérifier':'Check chapter duplication',detail:msg});
   }finally{setBusy(false);}
 }
 const start=(next:'create'|'rename'|'delete'|'duplicate'|'copy-book'|'merge')=>{
   if((next==='create'||next==='delete'||next==='duplicate'||next==='copy-book'||next==='merge')&&
      beforeNavigate?.()===false)return;
   if(next==='duplicate'){
     duplicateOperationRef.current=crypto.randomUUID();
     setDesired((locale==='fr'?'Copie de ':'Copy of ')+title.slice(0,140));
   }else setDesired(next==='create'?'':title);
   setError('');setMode(next);
 };
 return <>
   <ActionMenu label={t('chapter.actionsFor',{title})} disabled={busy} actions={[
     {label:t('chapter.open'),href:endpoint.replace('/api/v1',''),onSelect:()=>beforeNavigate?.()!==false},
     ...(editable?[{label:t('book.chapterAdd'),separatorBefore:true,onSelect:()=>start('create')},
       {label:t('chapter.rename'),onSelect:()=>start('rename')},
       {label:locale==='fr'?'Dupliquer ce chapitre…':'Duplicate this chapter…',
         onSelect:()=>start('duplicate')},
       {label:locale==='fr'?'Copier dans un autre livre…':'Copy to another book…',
         onSelect:()=>start('copy-book')},
       {label:locale==='fr'?'Fusionner avec un autre chapitre…':'Merge with another chapter…',
         onSelect:()=>start('merge')},
       ...(reorder?[{label:locale==='fr'?'Monter d’une position':'Move up one position',
         disabled:reorder.index<=0,onSelect:()=>void move('up')},
         {label:locale==='fr'?'Descendre d’une position':'Move down one position',
           disabled:reorder.index>=reorder.total-1,onSelect:()=>void move('down')}]:[]),
       {label:locale==='fr'?'Retirer le chapitre…':'Remove chapter…',destructive:true,
         onSelect:()=>start('delete')}]:[])
   ]}/>
   {mode==='copy-book'&&<ChapterCopyToBookDialog
     bookId={bookId} chapterId={chapterId} chapterTitle={title}
     beforeNavigate={beforeNavigate} onClose={()=>setMode(null)}/>}
   {mode==='merge'&&<ChapterMergeDialog
     bookId={bookId} firstChapterId={chapterId} firstTitle={title}
     beforeNavigate={beforeNavigate} onClose={()=>setMode(null)}/>}
   {mode&&mode!=='copy-book'&&mode!=='merge'&&typeof document!=='undefined'&&createPortal(<div className="modal-backdrop" style={{zIndex:2200}} onMouseDown={event=>{if(event.target===event.currentTarget)close();}}>
     <form className="modal" role="dialog" aria-modal="true"
       onKeyDown={event=>{
         if(mode!=='duplicate'||event.key!=='Tab')return;
         const items=[...event.currentTarget.querySelectorAll<HTMLElement>(
           'button:not([disabled]),input:not([disabled]),select:not([disabled])'
         )].filter(item=>item.getClientRects().length>0);
         const first=items[0],last=items[items.length-1];
         if(!first||!last)return;
         if(event.shiftKey&&document.activeElement===first){
           event.preventDefault();last.focus();
         }else if(!event.shiftKey&&document.activeElement===last){
           event.preventDefault();first.focus();
         }
       }}
       aria-label={mode==='duplicate'?
         (locale==='fr'?'Dupliquer le chapitre':'Duplicate chapter'):
         mode==='create'?t('book.newChapterTitle'):
         locale==='fr'?(mode==='delete'?'Retirer un chapitre':t('chapter.renameHeading')):
         (mode==='delete'?'Remove chapter':t('chapter.renameHeading'))} onSubmit={mode==='duplicate'?duplicateChapter:submit}>
       <button className="close" type="button" aria-label={t('common.close')} disabled={busy} onClick={close}>×</button>
       <div className="eyebrow">{t('chapter.section')}</div>
       <h2>{mode==='create'?t('book.newChapterTitle'):
         mode==='duplicate'?(locale==='fr'?'Dupliquer « '+title+' »':'Duplicate “'+title+'”'):
         mode==='rename'?t('chapter.renameHeading'):
         (locale==='fr'?'Retirer ce chapitre du manuscrit ?':'Remove this chapter from the manuscript?')}</h2>
       {mode!=='delete'?<>
         <p>{mode==='duplicate'?
           (locale==='fr'?
             'Un nouveau chapitre indépendant sera ajouté à la fin du livre, avec uniquement le dernier contenu enregistré. Les commentaires, snapshots et fichiers sources restent associés à l’original. Enregistrez d’abord vos brouillons. Le statut du livre reviendra à Brouillon.':
             'A new independent chapter will be appended with only the latest saved content. Comments, snapshots and source files remain on the original. Save your drafts first. Book status returns to Draft.'):
           mode==='create'?t('book.overviewSubtitle'):t('chapter.renameDetails')}</p>
         <label>{t('book.newTitle')}
           <input autoFocus required minLength={2} maxLength={180} value={desired}
             onChange={event=>setDesired(event.target.value)}/>
         </label>
       </>:<p>{locale==='fr'?
         '« '+title+' » disparaîtra de la navigation et de la recherche active. Son texte, ses révisions et ses commentaires seront conservés. Restauration possible depuis la vue d’ensemble.':
         '“'+title+'” will disappear from active navigation and search. Its content, revisions and comments remain preserved and can be restored from the overview.'}</p>}
       {error&&<p className="form-error" role="alert">{error}</p>}
       <button className={'button full'+(mode==='delete'?' is-danger':'')} type="submit" disabled={busy}>
         {busy?t('book.saving'):mode==='create'?t('book.chapterCreate'):
         mode==='duplicate'?(locale==='fr'?'Créer la copie du chapitre':'Create chapter copy'):mode==='delete'?
           (locale==='fr'?'Confirmer le retrait réversible':'Confirm reversible removal'):
           t('book.saveTitle')}
       </button>
       <button className="text-button" type="button" onClick={close} disabled={busy}>{t('common.cancel')}</button>
     </form>
   </div>,document.body)}
 </>;
}
