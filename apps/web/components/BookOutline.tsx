'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useAppPreferences} from './AppPreferences';
import type {SavedHeading} from '@/lib/saved-book-outline';
import {partBoundaryIndices} from '@/lib/book-parts';

type Chapter={id:string;title:string;revision:number;partId:string|null};
type Part={id:string;title:string};
type Entry={open:boolean;filter:string;appliedFilter:string;headings:SavedHeading[];
 total:number;revision:number;loaded:boolean;loading:boolean;error:boolean;hasMore:boolean};
type Payload={revision:number;headings:SavedHeading[];total:number;hasMore:boolean};
const empty=(revision:number):Entry=>({open:false,filter:'',appliedFilter:'',headings:[],
 total:0,revision,loaded:false,loading:false,error:false,hasMore:false});

/** Whole-book hierarchy is always available; only a selected chapter's saved
 * headings are downloaded. One request returns at most 60 headings, never prose. */
export default function BookOutline({bookId,chapters,parts}:{bookId:string;chapters:Chapter[];parts:Part[]}){
 const {locale}=useAppPreferences();
 const [entries,setEntries]=useState<Record<string,Entry>>({});
 const controllers=useRef(new Map<string,AbortController>());
 const revisions=chapters.map(c=>c.id+':'+c.revision).join('|');
 const partStarts=new Set(partBoundaryIndices(chapters));
 useEffect(()=>{
  const pending=controllers.current;
  return ()=>{for(const controller of pending.values())controller.abort();pending.clear();};
 },[]);
 useEffect(()=>{
  for(const controller of controllers.current.values())controller.abort();
  controllers.current.clear();setEntries({});
 },[revisions]);

 async function fetchHeadings(chapter:Chapter,filter:string,offset=0){
  controllers.current.get(chapter.id)?.abort();
  const controller=new AbortController();controllers.current.set(chapter.id,controller);
  setEntries(old=>({...old,[chapter.id]:{
   ...(old[chapter.id]??empty(chapter.revision)),loading:true,error:false,
   ...(offset===0?{headings:[],loaded:false}:null)
  }}));
  try{
   const params=new URLSearchParams({filter,offset:String(offset)});
   const response=await fetch(`/api/v1/books/${bookId}/chapters/${chapter.id}/outline?${params}`,{
    signal:controller.signal,cache:'no-store'
   });
   if(!response.ok)throw new Error('OUTLINE_FETCH_FAILED');
   const data=await response.json() as Payload;
   if(!Number.isSafeInteger(data.revision)||!Array.isArray(data.headings)||
    !Number.isSafeInteger(data.total)||typeof data.hasMore!=='boolean')throw new Error('OUTLINE_INVALID');
   setEntries(old=>{
    const entry=old[chapter.id]??empty(chapter.revision);
    return {...old,[chapter.id]:{...entry,loaded:true,loading:false,error:false,
     appliedFilter:filter,revision:data.revision,total:data.total,hasMore:data.hasMore,
     headings:offset===0?data.headings:[...entry.headings,...data.headings]}};
   });
  }catch{
   if(!controller.signal.aborted)setEntries(old=>({...old,[chapter.id]:{
    ...(old[chapter.id]??empty(chapter.revision)),loading:false,error:true
   }}));
  }finally{
   if(controllers.current.get(chapter.id)===controller)controllers.current.delete(chapter.id);
  }
 }
 function toggle(chapter:Chapter){
  const current=entries[chapter.id]??empty(chapter.revision);
  if(current.open){controllers.current.get(chapter.id)?.abort();
   setEntries(old=>({...old,[chapter.id]:{...(old[chapter.id]??empty(chapter.revision)),open:false,loading:false}}));
  }else{
   setEntries(old=>({...old,[chapter.id]:{...(old[chapter.id]??empty(chapter.revision)),open:true}}));
   if(!current.loaded)void fetchHeadings(chapter,current.appliedFilter);
  }
 }
 return <section id="book-outline" className="book-outline" aria-label={locale==='fr'?'Sommaire du livre':'Book table of contents'}>
  <div className="section-header"><h2>{locale==='fr'?'Sommaire global du livre':'Book table of contents'}</h2>
   <span>{chapters.length} {locale==='fr'?'chapitres':'chapters'}</span></div>
  <p className="source-note">{locale==='fr'?
   'Parties, chapitres et titres H1–H3 enregistrés sont présentés dans l’ordre du manuscrit. Ouvrez un chapitre pour atteindre une section du Studio. Les brouillons non enregistrés ne figurent pas ici.':
   'Saved parts, chapters and H1–H3 headings follow manuscript order. Expand a chapter to jump to a Studio section. Unsaved drafts are not shown.'}</p>
  <div className="book-outline-list">{chapters.map((chapter,index)=>{
   const entry=entries[chapter.id]??empty(chapter.revision);
   const boundary=partStarts.has(index);
   const label=boundary?parts.find(part=>part.id===chapter.partId)?.title:null;
   return <div key={chapter.id}>
    {label&&<div className="book-outline-part-label" role="heading" aria-level={3}>{label}</div>}
    <div className="book-outline-chapter">
    <div className="book-outline-chapter-top">
     <button type="button" className="book-outline-toggle" aria-expanded={entry.open}
       aria-controls={'book-outline-'+chapter.id} onClick={()=>toggle(chapter)}>
       <span aria-hidden="true" className="book-outline-number">{String(index+1).padStart(2,'0')}</span>
       <strong>{chapter.title}</strong><span aria-hidden="true">{entry.open?'−':'+'}</span>
     </button>
     <Link href={'/books/'+bookId+'/chapters/'+chapter.id} className="book-outline-open">
       {locale==='fr'?'Ouvrir':'Open'}
     </Link>
    </div>
    {entry.open&&<div id={'book-outline-'+chapter.id} className="book-outline-body">
      <form className="book-outline-filter" onSubmit={event=>{
       event.preventDefault();void fetchHeadings(chapter,entry.filter,0);
      }}>
       <label htmlFor={'book-outline-filter-'+chapter.id}>{locale==='fr'?'Rechercher un titre dans ce chapitre':'Find a heading in this chapter'}</label>
       <div><input id={'book-outline-filter-'+chapter.id} type="search" maxLength={100}
         placeholder={locale==='fr'?'Titre ou mot-clé…':'Heading or keyword…'} value={entry.filter}
         onChange={event=>setEntries(old=>({...old,[chapter.id]:{
          ...(old[chapter.id]??empty(chapter.revision)),filter:event.target.value
         }}))}/>
         <button type="submit" className="button small secondary" disabled={entry.loading}>
          {locale==='fr'?'Filtrer':'Filter'}</button></div>
      </form>
      {entry.error&&<div role="alert" className="book-outline-error">
        <span>{locale==='fr'?'Impossible de charger les sections enregistrées de ce chapitre.':'Could not load this chapter’s saved headings.'}</span>
        <button type="button" className="button small secondary" onClick={()=>void fetchHeadings(chapter,entry.appliedFilter,0)}>
         {locale==='fr'?'Réessayer':'Retry'}</button>
      </div>}
      {entry.loading&&<p role="status" className="source-note">{locale==='fr'?'Chargement des titres enregistrés…':'Loading saved headings…'}</p>}
      {entry.loaded&&!entry.loading&&<p role="status" className="book-outline-count">
       {locale==='fr'?`${entry.headings.length} sur ${entry.total} titres correspondants`:
        `${entry.headings.length} of ${entry.total} matching headings`}
       {entry.revision!==chapter.revision&&<span> · {locale==='fr'?'Révision actualisée':'Updated revision'} {entry.revision}</span>}
      </p>}
      {entry.loaded&&!entry.loading&&entry.total===0&&<p className="source-note">{locale==='fr'?
       (entry.appliedFilter?'Aucun titre H1–H3 correspondant.':'Aucun titre H1–H3 enregistré pour ce chapitre.'):
       (entry.appliedFilter?'No matching H1–H3 headings.':'No saved H1–H3 headings in this chapter.')}</p>}
      {entry.headings.length>0&&<nav className="book-outline-headings" aria-label={locale==='fr'?'Sections de '+chapter.title:'Sections in '+chapter.title}>
       {entry.headings.map(heading=><Link key={heading.ordinal} className="book-outline-heading"
        style={{paddingInlineStart:12+(heading.level-1)*18}}
        href={'/books/'+bookId+'/chapters/'+chapter.id+'?outlineRevision='+entry.revision+'&outlineOrdinal='+heading.ordinal}>
        <span className="book-outline-level">H{heading.level}</span><span>{heading.title}</span></Link>)}
      </nav>}
      {entry.loaded&&entry.hasMore&&<button type="button" className="button small secondary book-outline-more"
        disabled={entry.loading} onClick={()=>void fetchHeadings(chapter,entry.appliedFilter,entry.headings.length)}>
        {locale==='fr'?'Charger les titres suivants':'Load more headings'}</button>}
     </div>}
   </div></div>;
  })}</div>
  {chapters.length===0&&<p className="source-note">{locale==='fr'?'Ajoutez un chapitre pour construire le sommaire.':'Add a chapter to start a table of contents.'}</p>}
 </section>;
}
