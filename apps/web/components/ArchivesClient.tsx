'use client';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useState} from 'react';

type Archived={id:string;title:string;bookType:string;updatedAt:string;canRestore:boolean};
export default function ArchivesClient({books,displayName}:{books:Archived[];displayName:string}){
 const [busyId,setBusyId]=useState<string|null>(null),[error,setError]=useState('');
 const router=useRouter();
 async function restore(book:Archived){
  setBusyId(book.id);setError('');
  try{
   const result=await fetch('/api/v1/books/'+book.id,{method:'PATCH',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({action:'restore',expectedUpdatedAt:book.updatedAt})});
   const data=await result.json();
   if(!result.ok){
     setError(result.status===409?'Ce livre a changé depuis le chargement. Actualisez les archives.':data.error||'Restauration impossible.');
     return;
   }
   router.refresh();
  }catch{setError('Connexion interrompue. Veuillez réessayer.');}
  finally{setBusyId(null);}
 }
 return <div className="workspace">
   <aside className="nav"><Link href="/library" className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
   <div className="nav-section">MON ESPACE</div>
   <Link className="nav-link" href="/library">▦ Bibliothèque</Link>
   <Link className="nav-link" href="/search">⌕ Recherche</Link>
   <Link className="nav-link active" href="/library/archives" aria-current="page">▤ Archives</Link>
   <div className="nav-spacer"/><div className="nav-user"><span className="avatar">{displayName.charAt(0).toUpperCase()}</span>{displayName}</div>
   </aside>
   <main className="content">
    <header className="content-top"><span className="breadcrumb"><Link href="/library">Mon espace</Link> / <strong>Archives</strong></span><span className="save-badge">● Conservé en privé</span></header>
    <div className="content-inner"><div className="eyebrow">BIBLIOTHÈQUE · CONSERVATION</div><h1>Mes archives<span className="dot">.</span></h1>
     <p>Les livres archivés ne sont pas supprimés. Retrouvez-les ici pour les restaurer, avec leur historique et leurs versions.</p>
     <div className="section-header"><h2>Ouvrages archivés</h2><span>{books.length} livre{books.length>1?'s':''}</span></div>
     {error&&<p className="form-error" role="alert">{error}</p>}
     {books.length===0?<div className="search-empty">Aucun ouvrage archivé. <Link href="/library">Retour à la bibliothèque ↗</Link></div>:
     <div className="archive-list">{books.map(book=><div className="archive-item" key={book.id}>
       <div><strong>{book.title}</strong><small>Archivé · dernière modification {new Date(book.updatedAt).toLocaleDateString('fr-FR')}</small></div>
       {book.canRestore?<button type="button" className="button small" disabled={busyId!==null} onClick={()=>restore(book)}>{busyId===book.id?'Restauration…':'Restaurer'}</button>:<span className="status">Lecture seule</span>}
     </div>)}</div>}
    </div>
   </main>
 </div>;
}
