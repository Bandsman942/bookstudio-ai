'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useRouter} from 'next/navigation';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {explainActionError} from '@/lib/notification-copy';

type ChapterOption={id:string;title:string;revision:number;updatedAt:string};
type Props={
 bookId:string;firstChapterId:string;firstTitle:string;
 beforeNavigate?:()=>boolean;onClose:()=>void
};

/** Explicit, human-approved and NON destructive same-edition merge. The two
 * current saved revisions are reconfirmed before any server mutation. */
export default function ChapterMergeDialog({
 bookId,firstChapterId,firstTitle,beforeNavigate,onClose
}:Props){
 const {locale}=useAppPreferences(),{notify}=useToast(),router=useRouter();
 const [title,setTitle]=useState((locale==='fr'?'Fusion de ':'Merge of ')+
   firstTitle.slice(0,140));
 const [chapters,setChapters]=useState<ChapterOption[]>([]);
 const [secondId,setSecondId]=useState('');
 const [filter,setFilter]=useState('');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const runRef=useRef(0),inFlightRef=useRef(false);
 // Persist operationId for the same exact target/title after a network
 // failure. Different instructions use separate IDs.
 const operationsRef=useRef(new Map<string,string>());

 useEffect(()=>{
   let active=true;
   (async()=>{
     try{
       const response=await fetch('/api/v1/books/'+bookId+'/chapters',
         {cache:'no-store'});
       const body=await response.json().catch(()=>({})) as {
         chapters?:ChapterOption[]};
       if(!response.ok||!Array.isArray(body.chapters))
         throw Error('CHAPTERS_UNAVAILABLE');
       if(!active)return;
       const eligible=body.chapters.filter(c=>c.id!==firstChapterId);
       setChapters(eligible);
       setSecondId(eligible[0]?.id??'');
       if(eligible.length===0){
         setError(locale==='fr'?
           'Créez ou conservez au moins deux chapitres actifs dans cette édition pour les fusionner.':
           'This edition needs at least two active chapters to merge.');
       }
     }catch{
       if(!active)return;
       const detail=locale==='fr'?
         'Impossible de charger les chapitres disponibles. Réessayez après vérification de votre connexion.':
         'Cannot load the available chapters. Check your connection and retry.';
       setError(detail);
       notify({tone:'error',title:locale==='fr'?
         'Chapitres indisponibles':'Chapters unavailable',detail});
     }finally{if(active)setLoading(false);}
   })();
   return ()=>{active=false;runRef.current++;};
 // Only run once on dialog mount.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 useEffect(()=>{
   if(busy)return;
   const handle=(event:KeyboardEvent)=>{
     if(event.key==='Escape'){
       event.preventDefault();onClose();
     }
   };
   document.addEventListener('keydown',handle);
   return ()=>document.removeEventListener('keydown',handle);
 },[busy,onClose]);

 async function merge(event:React.FormEvent){
   event.preventDefault();
   if(inFlightRef.current||busy||loading||!secondId||
      !chapters.some(c=>c.id===secondId)||beforeNavigate?.()===false)return;
   inFlightRef.current=true;
   setBusy(true);setError('');
   const fingerprint=JSON.stringify({bookId,firstChapterId,
     secondChapterId:secondId,title:title.trim().replace(/\s+/g,' ')});
   let operationId=operationsRef.current.get(fingerprint);
   if(!operationId){
     operationId=window.crypto.randomUUID();
     operationsRef.current.set(fingerprint,operationId);
   }
   try{
     const [editionResponse,chaptersResponse]=await Promise.all([
       fetch('/api/v1/books/'+bookId+'/editions',{cache:'no-store'}),
       fetch('/api/v1/books/'+bookId+'/chapters',{cache:'no-store'})
     ]);
     const edition=await editionResponse.json().catch(()=>({})) as {
       currentEditionId?:string};
     const chapterData=await chaptersResponse.json().catch(()=>({})) as {
       chapters?:ChapterOption[]};
     const first=chapterData.chapters?.find(c=>c.id===firstChapterId),
       second=chapterData.chapters?.find(c=>c.id===secondId);
     if(!editionResponse.ok||!chaptersResponse.ok||
       !edition.currentEditionId||!first||!second){
       const detail=locale==='fr'?
         'Les chapitres ou l’édition ont changé avant la confirmation. Actualisez l’ouvrage et recommencez sans perte de texte.':
         'The chapters or current edition changed before confirmation. Refresh the book and retry; no text was lost.';
       setError(detail);
       notify({tone:'warning',title:locale==='fr'?
         'Fusion à réexaminer':'Review merger',detail});
       return;
     }
     const response=await fetch('/api/v1/books/'+bookId+'/chapters/'+
       firstChapterId+'/merge',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({
         confirm:'MERGE_SAVED_CHAPTERS_AS_NEW',
         secondChapterId:secondId,operationId,title,
         expectedEditionId:edition.currentEditionId,
         expectedFirstRevision:first.revision,
         expectedFirstUpdatedAt:first.updatedAt,
         expectedSecondRevision:second.revision,
         expectedSecondUpdatedAt:second.updatedAt
       })
     });
     const body=await response.json().catch(()=>({})) as {
       chapter?:{id:string;title:string};bookId?:string;error?:string};
     if(!response.ok||!body.chapter?.id||body.bookId!==bookId){
       const detail=explainActionError({locale,operation:'chapter-merge',
         status:response.status,code:body.error});
       setError(detail);
       notify({tone:response.status===409?'warning':'error',
         title:locale==='fr'?'Fusion des chapitres refusée':
           'Chapter merge refused',detail});
       return;
     }
     onClose();
     notify({tone:'success',title:locale==='fr'?
       'Nouveau chapitre fusionné créé':'New merged chapter created',
       detail:locale==='fr'?
         '« '+body.chapter.title+' » contient les blocs enregistrés des deux chapitres, dans l’ordre sélectionné. Les deux originaux et leurs commentaires sont intacts. Le livre repasse en Brouillon.':
         '“'+body.chapter.title+'” contains both saved chapter blocks in the selected order. Originals and comments remain untouched. Book status returns to Draft.'});
     router.push('/books/'+bookId+'/chapters/'+body.chapter.id);
     router.refresh();
   }catch{
     const detail=locale==='fr'?
       'La connexion a été interrompue. Vérifiez le sommaire avant de retenter : la même demande retrouvera le chapitre déjà créé, sans doublon.':
       'Connection lost. Check the chapter outline before retrying: the same request will return the existing chapter without duplicates.';
     setError(detail);notify({tone:'error',title:locale==='fr'?
       'Résultat de fusion à vérifier':'Verify merge result',detail});
   }finally{inFlightRef.current=false;setBusy(false);}
 }
 if(typeof document==='undefined')return null;
 const shown=chapters.filter(c=>c.title.toLocaleLowerCase().includes(
   filter.trim().toLocaleLowerCase()));
 return createPortal(<div className="modal-backdrop" style={{zIndex:2200}}
   onMouseDown={event=>{if(!busy&&event.target===event.currentTarget)onClose();}}>
   <form className="modal" role="dialog" aria-modal="true"
     aria-label={locale==='fr'?'Fusionner deux chapitres dans une nouvelle copie':
       'Merge two chapters into a new copy'} onSubmit={event=>void merge(event)}
     onKeyDown={event=>{
       if(event.key!=='Tab')return;
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
     }}>
     <button type="button" className="close" disabled={busy}
       aria-label={locale==='fr'?'Fermer':'Close'} onClick={onClose}>×</button>
     <div className="eyebrow">{locale==='fr'?'Nouvelle copie éditoriale':
       'New editorial copy'}</div>
     <h2>{locale==='fr'?'Fusionner deux chapitres…':'Merge two chapters…'}</h2>
     <p className="source-note">{locale==='fr'?
       'Les deux chapitres originaux restent intacts. Leurs blocs et styles enregistrés seront placés bout à bout, dans l’ordre indiqué, dans un NOUVEAU chapitre ajouté à la fin du sommaire. Aucun titre de section automatique, commentaire, ancienne révision, snapshot, source ou attestation antivirus ne sera importé. Sauvegardez vos brouillons d’abord.':
       'Both original chapters remain intact. Their saved rich-text blocks are concatenated in the displayed order into a NEW chapter appended to the outline. No automatic heading, comment, old revision, snapshot, source or antivirus attestation is imported. Save drafts first.'}</p>
     <div className="source-note">
       <strong>{locale==='fr'?'1. Premier chapitre : ':'1. First chapter: '}</strong>
       {firstTitle}
     </div>
     <label>{locale==='fr'?'Rechercher le deuxième chapitre':'Find the second chapter'}
       <input type="search" value={filter} maxLength={150} disabled={busy||loading}
         onChange={event=>setFilter(event.target.value)}
         placeholder={locale==='fr'?'Filtrer les titres de chapitres…':
           'Filter chapter titles…'}/></label>
     <label>{locale==='fr'?'2. Deuxième chapitre (ajouté après le premier)':
       '2. Second chapter (appended after the first)'}
       <select required value={shown.some(c=>c.id===secondId)?secondId:''}
         disabled={busy||loading||shown.length===0}
         onChange={event=>setSecondId(event.target.value)}>
         {shown.length===0&&<option value="">{loading?
           (locale==='fr'?'Chargement…':'Loading…'):
           (locale==='fr'?'Aucun chapitre correspondant':'No matching chapter')}</option>}
         {shown.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
       </select>
     </label>
     <label>{locale==='fr'?'Titre du nouveau chapitre fusionné':
       'Title for the new merged chapter'}
       <input autoFocus required minLength={2} maxLength={180}
         value={title} disabled={busy} onChange={event=>setTitle(event.target.value)}/></label>
     {error&&<p className="form-error" role="alert">{error}</p>}
     <button type="submit" className="button full"
       disabled={busy||loading||!secondId||!shown.some(c=>c.id===secondId)}>
       {busy?(locale==='fr'?'Création du chapitre fusionné…':'Creating merged chapter…'):
         (locale==='fr'?'Créer un nouveau chapitre fusionné':'Create new merged chapter')}
     </button>
     <button type="button" className="text-button" disabled={busy}
       onClick={onClose}>{locale==='fr'?'Annuler':'Cancel'}</button>
   </form>
 </div>,document.body);
}
