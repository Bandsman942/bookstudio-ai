'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useRouter} from 'next/navigation';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {explainActionError} from '@/lib/notification-copy';

type TargetBook={id:string;title:string;bookType:string;language:string};
type Props={bookId:string;chapterId:string;chapterTitle:string;
 beforeNavigate?:()=>boolean;onClose:()=>void};

/** An explicit destination selector that NEVER lists books outside the
 * source workspace or those not editable by the logged-in user. */
export default function ChapterCopyToBookDialog({
  bookId,chapterId,chapterTitle,beforeNavigate,onClose}:Props){
 const {locale}=useAppPreferences(),{notify}=useToast(),router=useRouter();
 const [title,setTitle]=useState((locale==='fr'?'Copie de ':'Copy of ')+
   chapterTitle.slice(0,140));
 const [search,setSearch]=useState('');
 const [targets,setTargets]=useState<TargetBook[]>([]);
 const [selected,setSelected]=useState('');
 const [hasMore,setHasMore]=useState(false);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const seqRef=useRef(0),operationRef=useRef<string|null>(null);
 const selectedRef=useRef('');
 const operationByDestinationRef=useRef(new Map<string,string>());

 async function loadDestinations(query:string){
   const seq=++seqRef.current;
   setLoading(true);setError('');
   try{
     const response=await fetch('/api/v1/books/'+bookId+
       '/chapter-copy-targets?search='+encodeURIComponent(query),
       {cache:'no-store'});
     const body=await response.json().catch(()=>({})) as {
       targets?:TargetBook[];hasMore?:boolean;error?:string};
     if(seq!==seqRef.current)return;
     if(!response.ok||!Array.isArray(body.targets))
       throw new Error('TARGETS_UNAVAILABLE');
     setTargets(body.targets);
     setHasMore(Boolean(body.hasMore));
     const next=body.targets.some(item=>item.id===selectedRef.current)?
       selectedRef.current:body.targets[0]?.id??'';
     // Changing destinations after an uncertain network response is a NEW
     // logical copy. Searching again for the SAME destination must preserve
     // the operationId so an interrupted request can replay without duplicates.
     if(next!==selectedRef.current){
       selectedRef.current=next;
       const operation=operationByDestinationRef.current.get(next)??
         window.crypto.randomUUID();
       if(next)operationByDestinationRef.current.set(next,operation);
       operationRef.current=operation;
     }
     setSelected(next);
   }catch{
     if(seq!==seqRef.current)return;
     setTargets([]);setSelected('');setHasMore(false);
     const detail=locale==='fr'?
       'Impossible de charger les ouvrages modifiables de cet espace. Vérifiez votre connexion.':
       'Could not load editable destination books in this workspace. Check your connection.';
     setError(detail);
     notify({tone:'error',title:locale==='fr'?'Destinations indisponibles':
       'Destinations unavailable',detail});
   }finally{if(seq===seqRef.current)setLoading(false);}
 }
 useEffect(()=>{
   operationRef.current=window.crypto.randomUUID();
   void loadDestinations('');
   return ()=>{seqRef.current++;};
 // Run once per mount (closing and reopening creates a new dialog instance).
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{
   if(busy)return;
   const handle=(event:KeyboardEvent)=>{
     if(event.key==='Escape'){event.preventDefault();onClose();}
   };
   document.addEventListener('keydown',handle);
   return ()=>document.removeEventListener('keydown',handle);
 },[busy,onClose]);

 async function copy(event:React.FormEvent){
   event.preventDefault();
   if(busy||loading||!selected||beforeNavigate?.()===false)return;
   const operationId=operationRef.current;
   if(!operationId)return;
   setBusy(true);setError('');
   try{
     const [sourceEditionResponse,sourceChaptersResponse,destinationEditionResponse]=
       await Promise.all([
         fetch('/api/v1/books/'+bookId+'/editions',{cache:'no-store'}),
         fetch('/api/v1/books/'+bookId+'/chapters',{cache:'no-store'}),
         fetch('/api/v1/books/'+selected+'/editions',{cache:'no-store'})
       ]);
     const sourceEdition=await sourceEditionResponse.json().catch(()=>({})) as {
       currentEditionId?:string;error?:string};
     const sourceChapters=await sourceChaptersResponse.json().catch(()=>({})) as {
       chapters?:{id:string;revision:number;updatedAt:string}[];error?:string};
     const destinationEdition=await destinationEditionResponse.json().catch(()=>({})) as {
       currentEditionId?:string;expectedUpdatedAt?:string;error?:string};
     const chapter=sourceChapters.chapters?.find(item=>item.id===chapterId);
     if(!sourceEditionResponse.ok||!sourceChaptersResponse.ok||
        !destinationEditionResponse.ok||!sourceEdition.currentEditionId||
        !chapter||!destinationEdition.currentEditionId||
        !destinationEdition.expectedUpdatedAt){
       const detail=locale==='fr'?
         'Impossible de vérifier les versions enregistrées et les éditions des deux livres. Actualisez puis recommencez.':
         'Could not verify the saved revisions and current editions of both books. Refresh and retry.';
       setError(detail);notify({tone:'error',
         title:locale==='fr'?'Vérification préalable impossible':'Preflight check failed',detail});
       return;
     }
     const response=await fetch('/api/v1/books/'+bookId+
       '/chapters/'+chapterId+'/copy-to-book',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({
         confirm:'COPY_CHAPTER_TO_BOOK_SAVED_ONLY',operationId,
         title,destinationBookId:selected,
         expectedSourceEditionId:sourceEdition.currentEditionId,
         expectedDestinationEditionId:destinationEdition.currentEditionId,
         expectedDestinationUpdatedAt:destinationEdition.expectedUpdatedAt,
         expectedRevision:chapter.revision,
         expectedChapterUpdatedAt:chapter.updatedAt
       })
     });
     const body=await response.json().catch(()=>({})) as {
       chapter?:{id:string;title:string};destinationBookId?:string;error?:string};
     if(!response.ok||!body.chapter?.id||body.destinationBookId!==selected){
       const detail=explainActionError({locale,operation:'chapter-copy-book',
         status:response.status,code:body.error});
       setError(detail);
       notify({tone:response.status===409?'warning':'error',
         title:locale==='fr'?'Copie vers le livre refusée':
           'Copy into book refused',detail});
       return;
     }
     onClose();
     notify({tone:'success',
       title:locale==='fr'?'Chapitre copié dans un autre ouvrage':
         'Chapter copied into another book',
       detail:locale==='fr'?
         '« '+body.chapter.title+' » a été ajouté à partir du dernier texte enregistré. L’original reste intact ; la destination revient à Brouillon.':
         '“'+body.chapter.title+'” was appended from saved content. The source remains unchanged; destination returns to Draft.'});
     router.push('/books/'+selected+'/chapters/'+body.chapter.id);
     router.refresh();
   }catch{
     const detail=locale==='fr'?
       'Connexion interrompue. Vérifiez la destination avant une nouvelle tentative. La même opération évite une deuxième copie.':
       'Connection lost. Check the destination before retrying. The same operation avoids a second copy.';
     setError(detail);notify({tone:'error',
       title:locale==='fr'?'Résultat de copie à vérifier':'Check copy result',detail});
   }finally{setBusy(false);}
 }
 if(typeof document==='undefined')return null;
 return createPortal(<div className="modal-backdrop" style={{zIndex:2200}}
   onMouseDown={event=>{if(!busy&&event.target===event.currentTarget)onClose();}}>
   <form className="modal" role="dialog" aria-modal="true"
     aria-label={locale==='fr'?'Copier un chapitre dans un autre livre':
       'Copy a chapter into another book'} onSubmit={event=>void copy(event)}
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
     <button className="close" type="button" disabled={busy}
       aria-label={locale==='fr'?'Fermer':'Close'} onClick={onClose}>×</button>
     <div className="eyebrow">{locale==='fr'?'Copie entre ouvrages':'Copy between books'}</div>
     <h2>{locale==='fr'?'Copier « '+chapterTitle+' »':
       'Copy “'+chapterTitle+'”'}</h2>
     <p className="source-note">{locale==='fr'?
       'Le chapitre d’origine ne sera pas déplacé ni modifié. Seul le dernier contenu sauvegardé est repris, sans commentaires, anciennes révisions, sources, fichiers ou attestations antivirus. Le livre de destination reviendra à Brouillon. Sauvegardez vos brouillons ouverts.':
       'The original chapter will not be moved or changed. Only its latest saved content is copied, excluding comments, older revisions, sources, files and antivirus attestations. The destination returns to Draft. Save open drafts first.'}</p>
     <label>{locale==='fr'?'Titre du chapitre dans le nouveau livre':
       'Chapter title in destination book'}
       <input autoFocus required minLength={2} maxLength={180} value={title}
         disabled={busy} onChange={event=>setTitle(event.target.value)}/></label>
     <div className="chapter-copy-destination">
       <label>{locale==='fr'?'Rechercher un ouvrage modifiable':
         'Search an editable book'}
         <input type="search" value={search} maxLength={100} disabled={busy||loading}
           onChange={event=>setSearch(event.target.value)}
           placeholder={locale==='fr'?'Titre du livre…':'Book title…'}/></label>
       <button type="button" className="button secondary" disabled={busy||loading}
         onClick={()=>void loadDestinations(search)}>
         {loading?(locale==='fr'?'Recherche…':'Searching…'):
           (locale==='fr'?'Rechercher':'Search')}</button>
       <label>{locale==='fr'?'Livre de destination':'Destination book'}
         <select required value={selected} disabled={busy||loading||targets.length===0}
           onChange={event=>{
             selectedRef.current=event.target.value;
             setSelected(event.target.value);
             const operation=operationByDestinationRef.current.get(event.target.value)??
               window.crypto.randomUUID();
             if(event.target.value)
               operationByDestinationRef.current.set(event.target.value,operation);
             operationRef.current=operation;
           }}>
           {targets.length===0&&<option value="">{loading?
             (locale==='fr'?'Chargement…':'Loading…'):
             (locale==='fr'?'Aucun autre ouvrage modifiable':'No other editable book')}</option>}
           {targets.map(book=><option key={book.id} value={book.id}>
             {book.title} ({book.language})</option>)}
         </select></label>
       {hasMore&&<p className="source-note">{locale==='fr'?
         'Plus de 50 livres correspondent : affinez avec des mots du titre.':
         'More than 50 books match: refine the title search.'}</p>}
     </div>
     {error&&<p role="alert" className="form-error">{error}</p>}
     <button type="submit" className="button full" disabled={busy||loading||!selected}>
       {busy?(locale==='fr'?'Copie en cours…':'Copying…'):
         (locale==='fr'?'Copier vers cet ouvrage':'Copy into this book')}</button>
     <button type="button" className="text-button" disabled={busy}
       onClick={onClose}>{locale==='fr'?'Annuler':'Cancel'}</button>
   </form>
 </div>,document.body);
}
