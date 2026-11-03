'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import SnapshotsPanel from './SnapshotsPanel';

type Chapter={id:string;title:string;revision:number};
type Props={bookId:string;title:string;status:string;kind:string;chapters:Chapter[];updatedAt:string;editable:boolean};
export default function BookOverview({bookId,title,status,kind,chapters,updatedAt,editable}:Props){
 const [newTitle,setNewTitle]=useState(''),[showForm,setShowForm]=useState(false),
       [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [renaming,setRenaming]=useState(false),[archiveConfirm,setArchiveConfirm]=useState(false);
 const [desiredTitle,setDesiredTitle]=useState(title),[bookError,setBookError]=useState('');
 const router=useRouter();
 async function add(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{
    const r=await fetch('/api/v1/books/'+bookId+'/chapters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newTitle})});
    const data=await r.json();if(!r.ok){setError(data.error||'Erreur');return;}
    router.push('/books/'+bookId+'/chapters/'+data.chapter.id);router.refresh();
  }catch{setError('Service indisponible');}finally{setBusy(false);}
 }
 async function changeBook(action:'rename'|'archive'){
  setBusy(true);setBookError('');
  try{
    const response=await fetch('/api/v1/books/'+bookId,{method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action,expectedUpdatedAt:updatedAt,...(action==='rename'?{title:desiredTitle}:{})})});
    const result=await response.json();
    if(!response.ok){
      setBookError(response.status===409?'Ce livre a été modifié depuis l’ouverture de cette page. Actualisez la page avant de recommencer.':result.error||'Modification impossible.');
      return;
    }
    if(action==='archive'){router.push('/library');router.refresh();}
    else {setRenaming(false);router.refresh();}
  }catch{setBookError('Connexion interrompue. Veuillez réessayer.');}finally{setBusy(false);}
 }
 return <div className="content-inner">
  <span className="eyebrow">VUE D'ENSEMBLE DU PROJET</span>
  <div className="book-title-actions"><div><h1>{title}<span className="dot">.</span></h1><p>Un espace entièrement dédié à votre ouvrage.</p></div>
  {editable&&<div className="book-controls">
    <button type="button" className="text-button" onClick={()=>{setBookError('');setDesiredTitle(title);setRenaming(true)}}>✎ Renommer</button>
    <button type="button" className="text-button archive-action" onClick={()=>{setBookError('');setArchiveConfirm(true)}}>Archiver</button>
  </div>}</div>
  <div className="overview-cards">
   <div><span>CHAPITRES</span><strong>{chapters.length}</strong><small>Organisés dans le manuscrit</small></div>
   <div><span>ÉTAT DU PROJET</span><strong className="status-label">{status==='DRAFT'?'Brouillon':status}</strong><small>Historique enregistré</small></div>
   <div><span>TYPE</span><strong className="status-label">{kind==='NOVEL'?'Roman':kind==='MEDICINE'?'Médical':kind==='SCIENCE'?'Scientifique':'Livre'}</strong><small>Atelier personnalisable</small></div>
  </div>
  <div className="section-header"><h2>Structure du manuscrit</h2>
  {editable&&<button className="button small" onClick={()=>setShowForm(true)}>＋ Ajouter un chapitre</button>}</div>
  <div className="chapter-list">{chapters.map((c,i)=><Link key={c.id} href={'/books/'+bookId+'/chapters/'+c.id} className="chapter-item">
    <span className="chapter-num">{String(i+1).padStart(2,'0')}</span><div><strong>{c.title}</strong><small>Révision {c.revision} · Ouvrir l'éditeur</small></div><span className="chapter-arrow">↗</span>
  </Link>)}</div>
  <SnapshotsPanel bookId={bookId}/>
  {showForm&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
    <form className="modal" onSubmit={add} role="dialog" aria-modal="true" aria-label="Nouveau chapitre">
      <button type="button" className="close" aria-label="Fermer" onClick={()=>setShowForm(false)}>×</button>
      <div className="eyebrow">NOUVEAU CHAPITRE</div><h2>Un nouveau chapitre commence.</h2>
      <label>Titre du chapitre<input autoFocus required minLength={2} maxLength={180} value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Ex. La première rencontre"/></label>
      {error&&<p role="alert" className="form-error">{error}</p>}
      <button className="button full" disabled={busy}>{busy?'Création…':'Ajouter ce chapitre →'}</button>
    </form>
  </div>}
  {renaming&&<div className="modal-backdrop">
    <form className="modal" onSubmit={async e=>{e.preventDefault();await changeBook('rename');}} role="dialog" aria-modal="true" aria-label="Renommer le livre">
      <button type="button" className="close" aria-label="Fermer" onClick={()=>setRenaming(false)}>×</button>
      <div className="eyebrow">GESTION DE L'OUVRAGE</div><h2>Renommer ce livre</h2>
      <label>Nouveau titre<input autoFocus required minLength={2} maxLength={180} value={desiredTitle} onChange={e=>setDesiredTitle(e.target.value)}/></label>
      {bookError&&<p role="alert" className="form-error">{bookError}</p>}
      <button className="button full" type="submit" disabled={busy}>{busy?'Mise à jour…':'Enregistrer le titre'}</button>
    </form>
  </div>}
  {archiveConfirm&&<div className="modal-backdrop">
    <div className="modal" role="dialog" aria-modal="true" aria-label="Confirmer l'archivage">
      <button type="button" className="close" aria-label="Fermer" onClick={()=>setArchiveConfirm(false)}>×</button>
      <div className="eyebrow">ARCHIVER SANS SUPPRIMER</div><h2>Mettre « {title} » aux archives ?</h2>
      <p>Le livre sera masqué de la bibliothèque et de la recherche active. Tous les chapitres, révisions, commentaires et snapshots seront conservés. Vous pourrez le restaurer depuis la rubrique Archives.</p>
      {bookError&&<p role="alert" className="form-error">{bookError}</p>}
      <button className="button full" type="button" disabled={busy} onClick={()=>changeBook('archive')}>{busy?'Archivage…':'Oui, archiver ce livre'}</button>
      <button className="text-button" type="button" disabled={busy} onClick={()=>setArchiveConfirm(false)}>Annuler</button>
    </div>
  </div>}
 </div>;
}
