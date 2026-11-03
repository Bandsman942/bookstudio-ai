'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import SnapshotsPanel from './SnapshotsPanel';
type Chapter={id:string;title:string;revision:number};
export default function BookOverview({bookId,title,status,kind,chapters}:{bookId:string;title:string;status:string;kind:string;chapters:Chapter[]}){
 const [newTitle,setNewTitle]=useState(''),[showForm,setShowForm]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),router=useRouter();
 async function add(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{
    const r=await fetch('/api/v1/books/'+bookId+'/chapters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newTitle})});
    const data=await r.json();if(!r.ok){setError(data.error||'Erreur');return;}
    router.push('/books/'+bookId+'/chapters/'+data.chapter.id);router.refresh();
  }catch{setError('Service indisponible');}finally{setBusy(false);}
 }
 return <div className="content-inner"><span className="eyebrow">VUE D'ENSEMBLE DU PROJET</span>
  <h1>{title}<span className="dot">.</span></h1><p>Un espace entièrement dédié à votre ouvrage.</p>
  <div className="overview-cards">
   <div><span>CHAPITRES</span><strong>{chapters.length}</strong><small>Organisés dans le manuscrit</small></div>
   <div><span>ÉTAT DU PROJET</span><strong className="status-label">{status==='DRAFT'?'Brouillon':status}</strong><small>Historique enregistré</small></div>
   <div><span>TYPE</span><strong className="status-label">{kind==='NOVEL'?'Roman':kind==='MEDICINE'?'Médical':kind==='SCIENCE'?'Scientifique':'Livre'}</strong><small>Atelier personnalisable</small></div>
  </div>
  <div className="section-header"><h2>Structure du manuscrit</h2><button className="button small" onClick={()=>setShowForm(true)}>＋ Ajouter un chapitre</button></div>
  <div className="chapter-list">{chapters.map((c,i)=><Link key={c.id} href={'/books/'+bookId+'/chapters/'+c.id} className="chapter-item"><span className="chapter-num">{String(i+1).padStart(2,'0')}</span><div><strong>{c.title}</strong><small>Révision {c.revision} · Ouvrir l'éditeur</small></div><span className="chapter-arrow">↗</span></Link>)}</div>
  <SnapshotsPanel bookId={bookId}/>
  {showForm&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
  <form className="modal" onSubmit={add}><button type="button" className="close" onClick={()=>setShowForm(false)}>×</button><div className="eyebrow">NOUVEAU CHAPITRE</div><h2>Un nouveau chapitre commence.</h2>
  <label>Titre du chapitre<input autoFocus required minLength={2} maxLength={180} value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Ex. La première rencontre"/></label>
  {error&&<p role="alert" className="form-error">{error}</p>}
  <button className="button full" disabled={busy}>{busy?'Création…':'Ajouter ce chapitre →'}</button></form></div>}
 </div>;
}
