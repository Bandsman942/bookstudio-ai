'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import AppIcon from './AppIcon';

type Hit={
 bookId:string;bookTitle:string;chapterId:string;
 chapterTitle:string;revision:number;snippet:string;updatedAt:string
};
type SearchPageResult={
 hits?:Hit[];query?:string;bookId?:string|null;
 hasMore?:boolean;nextOffset?:number|null;offset?:number;
 pageSize?:number;error?:string
};
/** Search only saved CURRENT editions; the server enforces membership and
 * scope. Infinite scrolling is deliberate button-driven to work on slow
 * mobile connections without losing loaded results. */
export default function SearchClient({bookId=null,bookTitle=null}:{
 bookId?:string|null;bookTitle?:string|null
}){
 const {t,locale}=useAppPreferences();
 const {notify}=useToast();
 const [query,setQuery]=useState('');
 const [hits,setHits]=useState<Hit[]>([]);
 const [searched,setSearched]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[lastQuery,setLastQuery]=useState('');
 const [hasMore,setHasMore]=useState(false);
 const [nextOffset,setNextOffset]=useState<number|null>(null);
 const sequence=useRef(0),abort=useRef<AbortController|null>(null);
 useEffect(()=>()=>abort.current?.abort(),[]);
 async function load(q:string,offset:number,append=false){
   const seq=++sequence.current;
   abort.current?.abort();
   const controller=new AbortController();abort.current=controller;
   setBusy(true);setError('');
   const params=new URLSearchParams({q,offset:String(offset)});
   if(bookId)params.set('bookId',bookId);
   try{
     const response=await fetch('/api/v1/search?'+params.toString(),
       {cache:'no-store',signal:controller.signal});
     const body=await response.json().catch(()=>({})) as SearchPageResult;
     if(seq!==sequence.current)return;
     if(!response.ok||!Array.isArray(body.hits)||
       typeof body.hasMore!=='boolean'||
       body.bookId!==(bookId??null)){
       const detail=response.status===401?
         (locale==='fr'?'Votre session a expiré. Reconnectez-vous pour consulter vos manuscrits.':
           'Your session has expired. Sign in again to search manuscripts.'):
         response.status===404?
         (locale==='fr'?'Cet ouvrage n’est plus accessible dans cet espace de travail.':
           'This book is no longer accessible in this workspace.'):
         response.status===400?t('search.invalidQuery'):t('search.unavailable');
       setError(detail);
       notify({tone:'error',
         title:locale==='fr'?'Recherche indisponible':'Search unavailable',detail});
       return;
     }
     setHits(previous=>append?[
       ...previous,...body.hits!.filter(hit=>!previous.some(old=>
         old.bookId===hit.bookId&&old.chapterId===hit.chapterId))
     ]:body.hits!);
     setLastQuery(q);setSearched(true);
     setHasMore(body.hasMore);
     setNextOffset(typeof body.nextOffset==='number'?body.nextOffset:null);
     if(!append){
       notify({tone:'info',title:locale==='fr'?'Recherche terminée':'Search finished',
         detail:locale==='fr'?'Première page de résultats enregistrés pour « '+q+' ».':
           'First page of saved results for “'+q+'”.'});
     }
   }catch{
     if(controller.signal.aborted||seq!==sequence.current)return;
     const detail=t('search.networkError');
     setError(detail);notify({tone:'error',
       title:locale==='fr'?'Recherche interrompue':'Search interrupted',detail});
   }finally{if(seq===sequence.current)setBusy(false);}
 }
 function search(event:React.FormEvent<HTMLFormElement>){
   event.preventDefault();
   const q=query.trim();
   if(q.length<2||q.length>80||/[\u0000-\u001f\u007f]/.test(q)){
     const detail=t('search.invalidLength');setError(detail);
     notify({tone:'warning',title:locale==='fr'?'Recherche non lancée':
       'Search not started',detail});return;
   }
   setHits([]);setHasMore(false);setNextOffset(null);
   setSearched(false);
   void load(q,0);
 }
 return <div className="content-inner search-space">
   <div className="eyebrow">{bookId?
     (locale==='fr'?'Recherche dans un seul ouvrage':'Search inside one book'):
     t('search.eyebrow')}</div>
   <h1>{bookId?(locale==='fr'?'Rechercher dans ce livre':
     'Search within this book'):t('search.heading')}<span className="dot">.</span></h1>
   {bookId?<div className="search-book-scope">
     <span>{locale==='fr'?'Périmètre privé':'Private scope'} :
       <strong> {bookTitle}</strong></span>
     <Link href={'/books/'+bookId}>
       <AppIcon name="arrowLeft"/>{locale==='fr'?'Retour à l’ouvrage':'Back to book'}
     </Link>
     <Link href="/search">{locale==='fr'?'Chercher dans tous mes livres':
       'Search all my books'}</Link>
     <p className="source-note">{locale==='fr'?
       'Seules les dernières révisions enregistrées des chapitres actifs de ce livre sont recherchées. Les brouillons non sauvegardés et les anciennes éditions sont exclus.':
       'Only the latest saved revisions of active chapters of this book are searched. Unsaved drafts and historical editions are excluded.'}</p>
   </div>:<p>{t('search.intro')}</p>}
   <form onSubmit={search} className="search-form" role="search">
     <label htmlFor="search-query" className="sr-only">{t('search.label')}</label>
     <input id="search-query" type="search" value={query}
       minLength={2} maxLength={80} autoComplete="off" required
       placeholder={t('search.placeholder')}
       onChange={event=>setQuery(event.target.value)}/>
     <button type="submit" className="button" disabled={busy}>
       {busy?t('search.searching'):<><AppIcon name="search"/>{t('search.button')}</>}
     </button>
   </form>
   {error&&<div className="form-error" role="alert">{error}</div>}
   <section aria-live="polite" aria-busy={busy} className="search-results">
     {searched&&<div className="section-header">
       <h2>{t('search.results',{query:lastQuery})}</h2>
       <span>{locale==='fr'?hits.length+' chapitre(s) chargé(s)':
         hits.length+' chapter(s) loaded'}
         {hasMore&&(locale==='fr'?' · d’autres résultats existent':
           ' · more results available')}</span>
     </div>}
     {searched&&hits.length===0&&<div className="search-empty">{t('search.none')}</div>}
     {hits.map(hit=><Link className="search-hit" key={hit.bookId+'/'+hit.chapterId}
       href={'/books/'+hit.bookId+'/chapters/'+hit.chapterId}>
       {!bookId&&<span className="search-hit-book">{hit.bookTitle}</span>}
       <strong>{hit.chapterTitle}</strong>
       <span className="search-hit-snippet">{hit.snippet}</span>
       <small>{t('search.resultRevision',{count:hit.revision})}</small>
     </Link>)}
     {searched&&hasMore&&<div className="search-load-more">
       <button type="button" className="button secondary" disabled={busy||nextOffset===null}
         onClick={()=>{if(nextOffset!==null)void load(lastQuery,nextOffset,true);}}>
         {busy?(locale==='fr'?'Chargement…':'Loading…'):
           (locale==='fr'?'Afficher les 30 résultats suivants':'Load next 30 results')}
       </button>
       <span className="source-note">{locale==='fr'?
         'Les résultats sont paginés, rien n’est silencieusement coupé.':
         'Results are paginated; nothing is silently cut off.'}</span>
     </div>}
     {!searched&&!busy&&<div className="search-empty">{t('search.privacy')}</div>}
   </section>
 </div>;
}
