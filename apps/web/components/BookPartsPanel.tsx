'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';

export type BookPart={id:string;title:string;updatedAt:string};
export type PartChapter={id:string;title:string;partId:string|null;updatedAt:string};
type Props={bookId:string;editionId:string;parts:BookPart[];chapters:PartChapter[];editable:boolean};

export default function BookPartsPanel({bookId,editionId,parts,chapters,editable}:Props){
 const {locale}=useAppPreferences(),{notify}=useToast(),router=useRouter();
 const [title,setTitle]=useState(''),[busy,setBusy]=useState('');
 const [renaming,setRenaming]=useState(''),[renameTitle,setRenameTitle]=useState('');
 const [confirmDelete,setConfirmDelete]=useState('');
 const fr=locale==='fr';
 const count=(id:string)=>chapters.filter(c=>c.partId===id).length;
 const explanation=(code:string,status:number)=>{
  if(code==='BOOK_PART_NOT_CONTIGUOUS')return fr?
   'Une partie doit regrouper des chapitres voisins dans l’ordre actuel. Affectez d’abord les chapitres intermédiaires ou réorganisez la structure.':
   'A part must contain adjacent chapters. Assign the intermediate chapters first or reorganize the book.';
  if(code==='BOOK_PART_NOT_EMPTY')return fr?
   'Détachez tous les chapitres de cette partie avant de la supprimer. Aucun chapitre ne sera effacé.':
   'Unassign every chapter before deleting this part. No chapter will be erased.';
  if(status===409)return fr?'Le sommaire a changé depuis votre dernière lecture. Actualisez la page avant de réessayer.':
   'The outline changed. Refresh the page and try again.';
  if(status===401||status===403||status===404)return fr?'Session ou droits insuffisants pour cette opération.':
   'Session or permissions do not allow this operation.';
  if(status===422)return fr?'Le nombre maximum de parties ou de chapitres est atteint.':
   'The maximum number of parts or chapters has been reached.';
  return fr?'Opération interrompue. Vérifiez votre connexion, puis réessayez.':
   'The operation failed. Check your connection and retry.';
 };
 async function send(path:string,method:'POST'|'PATCH'|'DELETE',body:object,
  action:string,subject:string){
  if(busy)return false;
  setBusy(action);
  try{
   const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)});
   const payload=await response.json().catch(()=>({}));
   if(!response.ok){notify({tone:'error',title:fr?'Organisation non modifiée':'Structure unchanged',
     detail:subject+' — '+explanation(payload.error??'',response.status)});return false;}
   notify({tone:'success',title:fr?'Organisation actualisée':'Structure updated',
    detail:subject});
   router.refresh();return true;
  }catch{
   notify({tone:'error',title:fr?'Connexion interrompue':'Connection interrupted',
    detail:subject+' — '+explanation('',0)});return false;
  }finally{setBusy('');}
 }
 async function create(event:React.FormEvent){
  event.preventDefault();const value=title.trim();if(!value)return;
  const success=await send(`/api/v1/books/${bookId}/parts`,'POST',{
   title:value,expectedEditionId:editionId},'create',fr?'Création de « '+value+' »':'Create “'+value+'”');
  if(success)setTitle('');
 }
 async function rename(event:React.FormEvent,part:BookPart){
  event.preventDefault();const value=renameTitle.trim();if(!value)return;
  const success=await send(`/api/v1/books/${bookId}/parts/${part.id}`,'PATCH',{
   title:value,expectedUpdatedAt:part.updatedAt,expectedEditionId:editionId},
   'rename:'+part.id,fr?'Partie renommée « '+value+' »':'Renamed part “'+value+'”');
  if(success)setRenaming('');
 }
 async function remove(part:BookPart){
  const success=await send(`/api/v1/books/${bookId}/parts/${part.id}`,'DELETE',{
   confirm:'DELETE_EMPTY_PART',expectedUpdatedAt:part.updatedAt,expectedEditionId:editionId},
   'delete:'+part.id,fr?'Partie vide « '+part.title+' » supprimée':'Empty part “'+part.title+'” removed');
  if(success)setConfirmDelete('');
 }
 async function assign(chapter:PartChapter,next:string,event:React.ChangeEvent<HTMLSelectElement>){
  const target=event.currentTarget;
  const name=parts.find(p=>p.id===next)?.title??(fr?'Sans partie':'Unassigned');
  const success=await send(`/api/v1/books/${bookId}/chapters/${chapter.id}/part`,'PATCH',{
   partId:next||null,expectedChapterUpdatedAt:chapter.updatedAt,expectedEditionId:editionId},
   'chapter:'+chapter.id,fr?`« ${chapter.title} » → ${name}`:`“${chapter.title}” → ${name}`);
  if(!success&&target.isConnected)target.value=chapter.partId??'';
 }
 return <section className="book-parts-panel" id="book-parts" aria-label={fr?'Parties de l’ouvrage':'Book parts'}>
  <div className="section-header"><h2>{fr?'Parties de l’ouvrage':'Book parts'}</h2>
   <span>{parts.length} {fr?'parties':'parts'}</span></div>
  <p className="source-note">{fr?
   'Organisez vos chapitres en parties (ex. Première partie, Deuxième partie). Chaque partie regroupe des chapitres consécutifs ; les textes, révisions et exports conservent leur ordre actuel.':
   'Organize chapters into parts (e.g. Part One, Part Two). Each part contains consecutive chapters; text, revisions and exports keep the current global order.'}</p>
  {editable&&<form className="book-parts-create" onSubmit={create}>
   <label htmlFor="book-part-title">{fr?'Nouvelle partie':'New part'}</label>
   <div><input id="book-part-title" required minLength={2} maxLength={180} value={title}
    onChange={event=>setTitle(event.target.value)} placeholder={fr?'Ex. Partie I — Fondements':'E.g. Part I — Foundations'}/>
    <button type="submit" className="button small" disabled={!!busy||title.trim().length<2}>
     {busy==='create'?(fr?'Création…':'Creating…'):(fr?'Ajouter une partie':'Add part')}</button></div>
  </form>}
  {parts.length>0&&<div className="book-parts-list">{parts.map(part=><div className="book-part-item" key={part.id}>
   {renaming===part.id?<form onSubmit={event=>void rename(event,part)} className="book-part-rename">
     <label htmlFor={'rename-part-'+part.id}>{fr?'Renommer la partie':'Rename part'}</label>
     <input id={'rename-part-'+part.id} autoFocus minLength={2} maxLength={180} required value={renameTitle}
      onChange={event=>setRenameTitle(event.target.value)}/>
     <button className="button small" disabled={!!busy}>{fr?'Enregistrer':'Save'}</button>
     <button type="button" className="button small secondary" onClick={()=>setRenaming('')}>{fr?'Annuler':'Cancel'}</button>
   </form>:<><div className="book-part-ident"><strong>{part.title}</strong><span>{count(part.id)} {fr?'chapitres':'chapters'}</span></div>
    {editable&&<div className="book-part-actions">
      <button type="button" className="button small secondary" disabled={!!busy}
       onClick={()=>{setRenaming(part.id);setRenameTitle(part.title);setConfirmDelete('');}}>
        {fr?'Renommer':'Rename'}</button>
      {confirmDelete===part.id?<>
       <button type="button" className="button small" disabled={!!busy}
        onClick={()=>void remove(part)}>{fr?'Confirmer':'Confirm'}</button>
       <button type="button" className="button small secondary" onClick={()=>setConfirmDelete('')}>
        {fr?'Annuler':'Cancel'}</button>
      </>:<button type="button" className="button small secondary" disabled={!!busy||count(part.id)>0}
        title={count(part.id)>0?(fr?'Détachez d’abord les chapitres':'Unassign chapters first'):undefined}
        onClick={()=>setConfirmDelete(part.id)}>{fr?'Supprimer':'Delete'}</button>}
    </div>}</>}
  </div>)}</div>}
  {!parts.length&&<p className="source-note">{fr?'Aucune partie. Les chapitres restent accessibles sans regroupement.':
   'No parts yet. All chapters remain available without groups.'}</p>}
  {parts.length>0&&<div className="book-part-assignments">
   <h3>{fr?'Rattacher les chapitres':'Assign chapters'}</h3>
   {chapters.map((chapter,index)=><div className="book-part-assignment" key={chapter.id}>
    <span>{String(index+1).padStart(2,'0')}. {chapter.title}</span>
    <label><span className="sr-only">{fr?'Partie de ':'Part for '}{chapter.title}</span>
     <select key={chapter.id+'|'+chapter.partId} defaultValue={chapter.partId??''}
      disabled={!editable||!!busy} onChange={event=>void assign(chapter,event.currentTarget.value,event)}>
      <option value="">{fr?'Sans partie':'Unassigned'}</option>
      {parts.map(part=><option key={part.id} value={part.id}>{part.title}</option>)}
     </select></label>
   </div>)}
  </div>}
  <p className="source-note">{fr?
   'Pour déplacer un chapitre dans une partie, choisissez sa destination. Si cela coupe une partie en deux, l’application refusera l’opération sans rien changer. Les parties vides peuvent être supprimées ; aucun chapitre ne l’est.':
   'Choose a chapter’s part. Changes that split an existing part are rejected without modifying anything. Empty parts can be deleted; chapters are never deleted by this action.'}</p>
 </section>;
}
