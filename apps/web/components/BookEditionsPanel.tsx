'use client';
import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';

type Edition={id:string;number:number;language:string;chapterCount:number;isCurrent:boolean};
type EditionList={editions:Edition[];currentEditionId:string|null;expectedUpdatedAt:string};
type Chapter={id:string;title:string;revisionSeq:number;position:number};
type EditionDetail={edition:{id:string;number:number;language:string;chapters:Chapter[]}};
type Preview={chapter:{id:string;title:string;revision:number;text:string;recordedAt:string}};
type Props={bookId:string;editable:boolean};

export default function BookEditionsPanel({bookId,editable}:Props){
 const {locale}=useAppPreferences(),{notify}=useToast(),router=useRouter();
 const [list,setList]=useState<EditionList|null>(null);
 const [selected,setSelected]=useState<Edition|null>(null);
 const [detail,setDetail]=useState<EditionDetail['edition']|null>(null);
 const [preview,setPreview]=useState<Preview['chapter']|null>(null);
 const [confirmNew,setConfirmNew]=useState(false);
 const [busy,setBusy]=useState(false),[reading,setReading]=useState(false);
 const [error,setError]=useState('');
 const fr=locale==='fr';
 const url='/api/v1/books/'+bookId+'/editions';
 const loadList=useCallback(async(signal?:AbortSignal)=>{
   try{
     const result=await fetch(url,{cache:'no-store',signal});
     const data=await result.json().catch(()=>null) as EditionList|null;
     if(!result.ok||!data||!Array.isArray(data.editions))
       throw Error('EDITION_LIST_UNAVAILABLE');
     if(!signal?.aborted)setList(data);
   }catch(e){
     if(signal?.aborted)return;
     setError(fr?'Impossible de consulter les éditions de cet ouvrage. Réessayez.':
       'Could not load this book’s editions. Please try again.');
   }
 },[url,fr]);
 useEffect(()=>{
   const controller=new AbortController();void loadList(controller.signal);
   return()=>controller.abort();
 },[loadList]);
 useEffect(()=>{
   if(!selected)return;
   const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy&&!reading){
     setSelected(null);setDetail(null);setPreview(null);
   }};
   document.addEventListener('keydown',key);
   return()=>document.removeEventListener('keydown',key);
 },[selected,busy,reading]);
 async function openEdition(edition:Edition){
   if(busy||reading)return;
   setSelected(edition);setDetail(null);setPreview(null);
   setReading(true);setError('');
   try{
     const res=await fetch(url+'/'+edition.id,{cache:'no-store'});
     const data=await res.json().catch(()=>null) as EditionDetail|null;
     if(!res.ok||!data?.edition)throw Error('EDITION_READ_UNAVAILABLE');
     setDetail(data.edition);
   }catch{
     setError(fr?'Le contenu historique de cette édition ne peut pas être chargé.':
       'The historical edition could not be loaded.');
   }finally{setReading(false);}
 }
 async function openChapter(chapter:Chapter){
   if(!selected||reading)return;
   setReading(true);setPreview(null);setError('');
   try{
     const res=await fetch(url+'/'+selected.id+'/chapters/'+chapter.id,{cache:'no-store'});
     const data=await res.json().catch(()=>null) as Preview|null;
     if(!res.ok||!data?.chapter)throw Error('EDITION_CHAPTER_UNAVAILABLE');
     setPreview(data.chapter);
   }catch{
     setError(fr?'La lecture de ce chapitre historique est indisponible.':
       'This historical chapter could not be read.');
   }finally{setReading(false);}
 }
 async function createEdition(){
   if(busy||!list?.currentEditionId)return;
   setBusy(true);setError('');
   try{
     const result=await fetch(url,{method:'POST',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({confirm:'CREATE_EDITION_FROM_SAVED',
         expectedEditionId:list.currentEditionId,
         expectedUpdatedAt:list.expectedUpdatedAt})
     });
     const data=await result.json().catch(()=>({})) as {error?:string;edition?:Edition};
     if(!result.ok){
       const detail=result.status===409?
         (fr?'La version du livre a changé. Actualisez la liste avant de recommencer.':
           'This book changed. Refresh the edition list before retrying.'):
         result.status===422?
         (fr?'La copie dépasse la capacité du traitement direct. Le manuscrit original reste intact.':
           'This copy exceeds the direct processing limit. The original manuscript is untouched.'):
         (fr?'Création de l’édition refusée. Vérifiez vos droits et réessayez.':
           'New edition was rejected. Check your permissions and try again.');
       setError(detail);notify({tone:result.status===409?'warning':'error',
         title:fr?'Nouvelle édition non créée':'New edition not created',detail});
       await loadList();return;
     }
     setConfirmNew(false);
     notify({tone:'success',title:fr?'Nouvelle édition créée':'New edition created',
       detail:fr?'Les derniers textes enregistrés ont été copiés. Les éditions précédentes, leurs révisions et leurs versions restent intactes.':
         'Latest saved text has been copied. Earlier editions, revisions and named snapshots remain unchanged.'});
     await loadList();
     router.refresh();
   }catch{
     const detail=fr?'Impossible de créer cette édition en raison d’un problème réseau. Vérifiez l’historique avant toute nouvelle tentative.':
       'A network error interrupted edition creation. Check the edition list before retrying.';
     setError(detail);notify({tone:'error',title:fr?'Création interrompue':'Creation interrupted',detail});
     await loadList();
   }finally{setBusy(false);}
 }
 const close=()=>{if(!reading&&!busy){setSelected(null);setDetail(null);setPreview(null);setError('');}};
 return <section id="book-editions" className="book-editions" aria-label={
   fr?'Éditions de cet ouvrage':'Editions of this book'}>
   <div className="section-header">
     <h2>{fr?'Éditions de l’ouvrage':'Book editions'}</h2>
     {editable&&list&&<button type="button" className="button small"
       onClick={()=>setConfirmNew(true)} disabled={busy}>
       {fr?'Créer une nouvelle édition':'Create new edition'}
     </button>}
   </div>
   <p className="source-note">{fr?
     'Chaque édition conserve ses chapitres. Les versions plus anciennes sont consultables en lecture seule.':
     'Each edition preserves its chapters. Older editions can only be viewed, not edited.'}</p>
   {error&&<p className="form-error" role="alert">{error}</p>}
   {!list?<button type="button" className="text-button" onClick={()=>void loadList()}>
     {fr?'Charger les éditions':'Load editions'}
   </button>:<div className="book-edition-list">
     {list.editions.map(edition=><div key={edition.id} className="book-edition-row">
       <div><strong>{fr?'Édition':'Edition'} {edition.number}</strong>
         <span className="source-note">{edition.language.toUpperCase()} · {
           edition.chapterCount} {fr?'chapitres':'chapters'}</span>
       </div>
       <span className={edition.isCurrent?'badge success':'badge'}>
         {edition.isCurrent?(fr?'Courante':'Current'):(fr?'Historique':'Historical')}
       </span>
       <button type="button" className="text-button"
         onClick={()=>void openEdition(edition)} disabled={reading||busy}>
         {fr?'Consulter':'View'}
       </button>
     </div>)}
   </div>}
   {confirmNew&&<div className="modal-backdrop" onMouseDown={event=>{
     if(event.target===event.currentTarget&&!busy)setConfirmNew(false);
   }}>
     <div className="modal" role="dialog" aria-modal="true"
       aria-label={fr?'Confirmer la nouvelle édition':'Confirm new edition'}>
       <button type="button" className="close" aria-label={fr?'Fermer':'Close'}
         onClick={()=>setConfirmNew(false)} disabled={busy}>×</button>
       <h2>{fr?'Créer une nouvelle édition ?':'Create a new edition?'}</h2>
       <p>{fr?
         'Les derniers textes enregistrés des chapitres actifs seront copiés dans une nouvelle édition indépendante. Les anciennes éditions resteront consultables. Les commentaires, sources et validations ne seront pas copiés. Le statut éditorial du livre reviendra à Brouillon.':
         'Latest saved text from active chapters will be copied into an independent edition. Earlier editions remain readable. Comments, sources and approvals are not copied. Editorial status returns to Draft.'}</p>
       <button type="button" className="button full" onClick={()=>void createEdition()}
         disabled={busy}>{busy?(fr?'Copie en cours…':'Copying…'):
           (fr?'Confirmer la création':'Confirm creation')}</button>
       <button type="button" className="text-button" onClick={()=>setConfirmNew(false)}
         disabled={busy}>{fr?'Annuler':'Cancel'}</button>
     </div>
   </div>}
   {selected&&<div className="modal-backdrop" onMouseDown={event=>{
     if(event.target===event.currentTarget)close();
   }}>
     <div className="modal edition-reader" role="dialog" aria-modal="true"
       aria-label={(fr?'Lecture de l’édition ':'Reading edition ')+selected.number}>
       <button type="button" className="close" onClick={close} disabled={reading}
         aria-label={fr?'Fermer':'Close'}>×</button>
       <h2>{fr?'Édition':'Edition'} {selected.number}</h2>
       <p className="source-note">{fr?
         'Consultation en lecture seule — aucun chapitre ni aucune révision n’est modifié.':
         'Read-only history — no chapter or revision is modified.'}</p>
       {reading&&<p role="status">{fr?'Chargement…':'Loading…'}</p>}
       {error&&<p role="alert" className="form-error">{error}</p>}
       {detail&&<div className="edition-reader-layout">
         <nav className="edition-reader-chapters" aria-label={fr?'Chapitres historiques':'Historical chapters'}>
           {detail.chapters.map((chapter,index)=><button key={chapter.id} type="button"
             disabled={reading} onClick={()=>void openChapter(chapter)}>
             {index+1}. {chapter.title}
           </button>)}
         </nav>
         <div className="edition-reader-text">
           {preview?<><h3>{preview.title}</h3>
             <p className="source-note">{fr?'Révision enregistrée':'Saved revision'} {preview.revision}</p>
             <pre>{preview.text|| (fr?'Ce chapitre était vide.':'This chapter was empty.')}</pre>
           </>:<p className="source-note">{fr?
             'Choisissez un chapitre pour afficher sa dernière version enregistrée.':
             'Select a chapter to read its latest saved version.'}</p>}
         </div>
       </div>}
     </div>
   </div>}
 </section>;
}
