'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
type Book={id:string;title:string;bookType:string;status:string;updatedAt:string};
export default function LibraryClient({books,displayName}:{books:Book[];displayName:string}){
 const [creating,setCreating]=useState(false),[title,setTitle]=useState(''),[kind,setKind]=useState('GENERAL'),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const router=useRouter();
 async function create(e:React.FormEvent){
  e.preventDefault();setError('');setLoading(true);
  try{
    const r=await fetch('/api/v1/books',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,bookType:kind,language:'fr'})});
    const result=await r.json();if(!r.ok){setError(result.error||'Impossible de créer le livre.');return;}
    router.push('/books/'+result.book.id);router.refresh();
  }catch{setError('Connexion indisponible.');}finally{setLoading(false);}
 }
 return <div className="workspace"><aside className="nav">
  <div className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></div>
  <div className="nav-section">MON ESPACE</div>
  <Link className="nav-link active" href="/library">▦ Bibliothèque</Link>
  <Link className="nav-link" href="/search">⌕ Recherche</Link>
  <Link className="nav-link" href="/library/archives">▤ Archives</Link>
  <span className="nav-link subdued">▤ Modèles <small className="soon">Bientôt</small></span>
  <div className="nav-spacer"/>
  <div className="nav-user"><span className="avatar">{displayName.charAt(0).toUpperCase()}</span><span>{displayName}<small>Auteur</small></span></div>
 </aside><main className="content">
  <header className="content-top"><span className="breadcrumb">Mon espace / <strong>Bibliothèque</strong></span>
  <button className="text-button" onClick={async()=>{await fetch('/api/v1/auth/logout',{method:'POST'});router.push('/login');router.refresh();}}>Déconnexion</button></header>
  <div className="content-inner"><div className="title-row"><div><span className="eyebrow">VOTRE ATELIER D'ÉCRITURE</span><h1>Ma bibliothèque<span className="dot">.</span></h1><p>Vos idées ont trouvé leur place.</p></div>
  <button className="button" onClick={()=>setCreating(true)}>＋ Nouveau livre</button></div>
  <div className="stat-row"><div><strong>{books.length}</strong><span>Livres</span></div><div><strong>{books.filter(b=>b.status==='WRITING').length}</strong><span>En rédaction</span></div><div><strong>{books.filter(b=>b.status==='REVIEW').length}</strong><span>En révision</span></div></div>
  <div className="section-header"><h2>Mes ouvrages</h2><span>{books.length} projet{books.length>1?'s':''}</span></div>
  <div className="book-grid">
    {books.map((book,i)=><Link key={book.id} href={'/books/'+book.id} className="book-card">
      <div className={'cover cover-'+(i%4)}><span>BOOKSTUDIO</span><strong>{book.title}</strong><small>by DTSC</small></div>
      <div className="book-meta"><h3>{book.title}</h3><p>{book.bookType==='NOVEL'?'Roman':book.bookType==='MEDICINE'?'Médecine':book.bookType==='SCIENCE'?'Scientifique':'Ouvrage'} · Modifié le {new Date(book.updatedAt).toLocaleDateString('fr-FR')}</p><span className="status">{book.status==='DRAFT'?'Brouillon':book.status==='WRITING'?'En rédaction':book.status}</span></div>
    </Link>)}
    <button className="new-book-card" onClick={()=>setCreating(true)}><span>＋</span><strong>Commencer un livre</strong><small>Créer à partir de zéro</small></button>
  </div></div></main>
  {creating&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCreating(false);}}>
    <form className="modal" onSubmit={create}><button type="button" className="close" onClick={()=>setCreating(false)}>×</button>
      <div className="eyebrow">NOUVEL OUVRAGE</div><h2>Et si on commençait un livre ?</h2>
      <p>Donnez un titre provisoire à votre idée. Vous pourrez le modifier plus tard.</p>
      <label>Titre du livre<input autoFocus required minLength={2} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Le titre de mon prochain livre"/></label>
      <label>Type d'ouvrage<select value={kind} onChange={e=>setKind(e.target.value)}>
        <option value="GENERAL">Général</option><option value="NOVEL">Roman</option><option value="ESSAY">Essai</option><option value="SCIENCE">Scientifique</option><option value="MEDICINE">Médical</option><option value="EDUCATION">Pédagogique</option>
      </select></label>
      {error&&<div role="alert" className="form-error">{error}</div>}
      <button disabled={loading} className="button full">{loading?'Création…':'Créer mon livre →'}</button>
    </form>
  </div>}
 </div>;
}
