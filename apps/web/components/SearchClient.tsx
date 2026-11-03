'use client';
import { useState } from 'react';
import Link from 'next/link';

type Hit = {
  bookId:string; bookTitle:string; chapterId:string;
  chapterTitle:string; revision:number; snippet:string; updatedAt:string;
};
export default function SearchClient() {
  const [query,setQuery]=useState('');
  const [hits,setHits]=useState<Hit[]>([]);
  const [searched,setSearched]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [lastQuery,setLastQuery]=useState('');

  useEffect(()=>{
    const controller=new AbortController();
    return ()=>controller.abort();
  },[]);

  async function search(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q=query.trim();
    if(q.length<2||q.length>80){setError('Indiquez entre 2 et 80 caractères.');return;}
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/v1/search?q='+encodeURIComponent(q),{cache:'no-store'});
      const body=await response.json();
      if(!response.ok){setError(body.error==='SEARCH_QUERY_INVALID'?'Requête incorrecte.':'La recherche est momentanément indisponible.');return;}
      setHits(body.hits);setLastQuery(q);setSearched(true);
    } catch {setError('Connexion interrompue. Vérifiez votre réseau, puis relancez la recherche.');}
    finally {setBusy(false);}
  }

  return <div className="content-inner search-space">
    <div className="eyebrow">RECHERCHE DANS VOS OUVRAGES</div>
    <h1>Retrouvez vos idées<span className="dot">.</span></h1>
    <p>Recherchez un mot ou une expression dans les chapitres <strong>déjà enregistrés</strong> auxquels vous avez accès.</p>
    <form onSubmit={search} className="search-form" role="search">
      <label htmlFor="search-query" className="sr-only">Mots à retrouver dans vos manuscrits</label>
      <input id="search-query" value={query} minLength={2} maxLength={80}
        placeholder="Ex. une référence, un personnage, un diagnostic…"
        onChange={event=>setQuery(event.target.value)} autoComplete="off" required />
      <button type="submit" className="button" disabled={busy}>{busy?'Recherche…':'⌕ Rechercher'}</button>
    </form>
    {error&&<div className="form-error" role="alert">{error}</div>}
    <section aria-live="polite" aria-busy={busy} className="search-results">
      {searched&&<div className="section-header"><h2>Résultats pour « {lastQuery} »</h2><span>{hits.length} résultat(s) {hits.length===30?'— maximum affiché':''}</span></div>}
      {searched&&hits.length===0&&<div className="search-empty">Aucun passage trouvé dans vos manuscrits enregistrés. Vérifiez l’orthographe ou essayez un mot plus court.</div>}
      {hits.map(hit=><Link className="search-hit" key={hit.chapterId} href={'/books/'+hit.bookId+'/chapters/'+hit.chapterId}>
        <span className="search-hit-book">{hit.bookTitle}</span>
        <strong>{hit.chapterTitle}</strong>
        <span className="search-hit-snippet">{hit.snippet}</span>
        <small>Révision {hit.revision} · Ouvrir ce chapitre ↗</small>
      </Link>)}
      {!searched&&!busy&&<div className="search-empty">Votre recherche restera privée et ne sera jamais transmise à un service d’IA externe.</div>}
    </section>
  </div>;
}
