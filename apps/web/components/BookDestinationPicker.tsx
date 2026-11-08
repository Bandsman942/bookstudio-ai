'use client';
import {useEffect,useRef,useState} from 'react';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';

type Choice={id:string;title:string};
type Page={books:Choice[];total:number;nextCursor:string|null};
type Props={books:Choice[];value:string;onChange:(id:string)=>void;
  onCreateBook:()=>void;disabled:boolean};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Independent picker: never restrict imports to the 24 rendered library cards. */
export default function BookDestinationPicker({books:initialBooks,value,onChange,
  onCreateBook,disabled}:Props){
 const {locale}=useAppPreferences(),{notify}=useToast();
 const [books,setBooks]=useState<Choice[]>(initialBooks);
 const [query,setQuery]=useState(''),[appliedQuery,setAppliedQuery]=useState('');
 const [nextCursor,setNextCursor]=useState<string|null>(null);
 const [loading,setLoading]=useState(false),[loaded,setLoaded]=useState(false),
   [error,setError]=useState(''),[total,setTotal]=useState(initialBooks.length);
 const abort=useRef<AbortController|null>(null),generation=useRef(0);

 async function load(text:string,cursor:string|null){
   const gen=++generation.current;abort.current?.abort();
   const controller=new AbortController();abort.current=controller;
   setLoading(true);setError('');
   const params=new URLSearchParams({editable:'1',sort:'title',limit:'20'});
   if(text)params.set('q',text);
   if(cursor)params.set('cursor',cursor);
   try{
     const result=await fetch('/api/v1/books?'+params.toString(),
       {cache:'no-store',signal:controller.signal});
     const page=await result.json().catch(()=>null) as Page|null;
     if(!result.ok||!page||!Array.isArray(page.books)||
       page.books.some(b=>!uuid.test(b.id)||typeof b.title!=='string'||
         b.title.length>180))throw Error('DESTINATION_LIST_UNAVAILABLE');
     if(gen!==generation.current)return;
     const incoming=page.books.map(b=>({id:b.id,title:b.title}));
     if(cursor){
       setBooks(prev=>{
         const merged=[...prev];
         for(const book of incoming){
           if(!merged.some(existing=>existing.id===book.id))merged.push(book);
         }
         return merged;
       });
     }else{
       setBooks(incoming);
       if(!incoming.some(b=>b.id===value))onChange(incoming[0]?.id??'');
     }
     setNextCursor(page.nextCursor??null);
     setTotal(page.total);
     setAppliedQuery(text);
     setLoaded(true);
   }catch{
     if(controller.signal.aborted||gen!==generation.current)return;
     const detail=locale==='fr'?
       'Impossible de charger les destinations d’import accessibles. Vérifiez la connexion et relancez la recherche ; aucun fichier n’a été envoyé.':
       'Could not load available import destinations. Check the connection and try searching again; no file was uploaded.';
     setError(detail);
     notify({tone:'error',title:locale==='fr'?
       'Recherche des ouvrages interrompue':'Book destination search interrupted',detail});
   }finally{
     if(gen===generation.current)setLoading(false);
   }
 }
 useEffect(()=>{
   void load('',null);
   return()=>{generation.current++;abort.current?.abort();};
   // First fetch is independent of the main library page.
   // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const selected=books.some(b=>b.id===value)?value:(books[0]?.id??'');
 return <div className="import-destination-panel">
   <label htmlFor="import-book-search">{locale==='fr'?
     'Rechercher un ouvrage de destination':'Search destination book'}
     <input id="import-book-search" type="search" value={query} maxLength={80}
       disabled={disabled} placeholder={locale==='fr'?'Titre du livre…':'Book title…'}
       onChange={event=>setQuery(event.target.value)}
       onKeyDown={event=>{if(event.key==='Enter'){
         event.preventDefault();if(!loading&&!disabled)void load(query.trim(),null);
       }}}/>
   </label>
   <div className="import-destination-actions">
     <button type="button" className="text-button" disabled={disabled||loading}
       onClick={()=>void load(query.trim(),null)}>{locale==='fr'?'Rechercher':'Search'}</button>
     <span className="source-note" role="status" aria-live="polite">
       {loading?(locale==='fr'?'Chargement des livres…':'Loading books…'):
         (locale==='fr'?total+' ouvrage(s) disponible(s)':total+' available book(s)')}
     </span>
   </div>
   {books.length>0?<label htmlFor="import-book">
     {locale==='fr'?'Choisir le livre':'Select book'}
     <select id="import-book" value={selected} disabled={disabled||loading}
       onChange={event=>onChange(event.target.value)}>
       {books.map(book=><option key={book.id} value={book.id}>{book.title}</option>)}
     </select>
   </label>:!loading&&loaded?<div className="import-empty" role="status">
     <p>{locale==='fr'?'Aucun livre modifiable ne correspond à cette recherche.':
       'No writable book matches this search.'}</p>
     <button type="button" className="text-button" disabled={disabled} onClick={onCreateBook}>
       {locale==='fr'?'Créer un nouveau livre':'Create a new book'}
     </button>
   </div>:null}
   {nextCursor&&<button type="button" className="text-button" disabled={disabled||loading}
     onClick={()=>void load(appliedQuery,nextCursor)}>
     {locale==='fr'?'Afficher d’autres livres':'Show more books'}
   </button>}
   {error&&<p role="alert" className="form-error">{error}</p>}
 </div>;
}
