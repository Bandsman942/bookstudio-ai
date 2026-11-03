'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import SnapshotsPanel from './SnapshotsPanel';
import BookActionsMenu from './BookActionsMenu';
import ChapterActionsMenu from './ChapterActionsMenu';

type Chapter={id:string;title:string;revision:number};
type Props={
  bookId:string;title:string;status:string;kind:string;
  chapters:Chapter[];updatedAt:string;editable:boolean
};

export default function BookOverview({bookId,title,status,kind,chapters,updatedAt,editable}:Props){
  const [newTitle,setNewTitle]=useState(''),[showForm,setShowForm]=useState(false),
        [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const router=useRouter();
  async function add(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');
    try{
      const response=await fetch('/api/v1/books/'+bookId+'/chapters',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newTitle})
      });
      const payload=await response.json();
      if(!response.ok){setError(payload.error||'Impossible de créer le chapitre.');return;}
      router.push('/books/'+bookId+'/chapters/'+payload.chapter.id);
      router.refresh();
    }catch{setError('Service momentanément indisponible.');}
    finally{setBusy(false);}
  }
  return <div className="content-inner">
    <span className="eyebrow">VUE D'ENSEMBLE DU PROJET</span>
    <div className="book-title-actions">
      <div><h1>{title}<span className="dot">.</span></h1><p>Un espace entièrement dédié à votre ouvrage.</p></div>
      {editable&&<BookActionsMenu bookId={bookId} title={title} updatedAt={updatedAt} editable onArchive="library"/>}
    </div>
    <div className="overview-cards">
      <div><span>CHAPITRES</span><strong>{chapters.length}</strong><small>Organisés dans le manuscrit</small></div>
      <div><span>ÉTAT DU PROJET</span><strong className="status-label">{status==='DRAFT'?'Brouillon':status}</strong><small>Historique enregistré</small></div>
      <div><span>TYPE</span><strong className="status-label">{kind==='NOVEL'?'Roman':kind==='MEDICINE'?'Médical':kind==='SCIENCE'?'Scientifique':'Livre'}</strong><small>Atelier personnalisable</small></div>
    </div>
    <div className="section-header"><h2>Structure du manuscrit</h2>
      {editable&&<button className="button small" type="button" onClick={()=>setShowForm(true)}>＋ Ajouter un chapitre</button>}
    </div>
    <div className="chapter-list">{chapters.map((chapter,index)=><Link key={chapter.id}
      href={'/books/'+bookId+'/chapters/'+chapter.id} className="chapter-item">
      <span className="chapter-num">{String(index+1).padStart(2,'0')}</span>
      <div><strong>{chapter.title}</strong><small>Révision {chapter.revision} · Ouvrir l'éditeur</small></div>
      <span className="chapter-arrow" aria-hidden="true">↗</span>
    </Link>)}</div>
    <SnapshotsPanel bookId={bookId} editable={editable}/>
    {showForm&&<div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setShowForm(false);}}>
      <form className="modal" onSubmit={add} role="dialog" aria-modal="true" aria-label="Nouveau chapitre">
        <button className="close" type="button" aria-label="Fermer" onClick={()=>setShowForm(false)}>×</button>
        <div className="eyebrow">NOUVEAU CHAPITRE</div><h2>Un nouveau chapitre commence.</h2>
        <label>Titre du chapitre<input autoFocus required minLength={2} maxLength={180}
          value={newTitle} onChange={event=>setNewTitle(event.target.value)}
          placeholder="Ex. La première rencontre"/></label>
        {error&&<p role="alert" className="form-error">{error}</p>}
        <button className="button full" disabled={busy}>{busy?'Création…':'Ajouter ce chapitre →'}</button>
      </form>
    </div>}
  </div>;
}
