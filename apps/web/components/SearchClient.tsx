'use client';
import { useState } from 'react';
import Link from 'next/link';
import {useAppPreferences} from './AppPreferences';

type Hit = {
  bookId:string; bookTitle:string; chapterId:string;
  chapterTitle:string; revision:number; snippet:string; updatedAt:string;
};
export default function SearchClient() {
  const {t}=useAppPreferences();
  const [query,setQuery]=useState('');
  const [hits,setHits]=useState<Hit[]>([]);
  const [searched,setSearched]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [lastQuery,setLastQuery]=useState('');

  async function search(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q=query.trim();
    if(q.length<2||q.length>80){setError(t('search.invalidLength'));return;}
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/v1/search?q='+encodeURIComponent(q),{cache:'no-store'});
      const body=await response.json();
      if(!response.ok){setError(body.error==='SEARCH_QUERY_INVALID'?t('search.invalidQuery'):t('search.unavailable'));return;}
      setHits(body.hits);setLastQuery(q);setSearched(true);
    } catch {setError(t('search.networkError'));}
    finally {setBusy(false);}
  }

  return <div className="content-inner search-space">
    <div className="eyebrow">{t('search.eyebrow')}</div>
    <h1>{t('search.heading')}<span className="dot">.</span></h1>
    <p>{t('search.intro')}</p>
    <form onSubmit={search} className="search-form" role="search">
      <label htmlFor="search-query" className="sr-only">{t('search.label')}</label>
      <input id="search-query" value={query} minLength={2} maxLength={80}
        placeholder={t('search.placeholder')}
        onChange={event=>setQuery(event.target.value)} autoComplete="off" required />
      <button type="submit" className="button" disabled={busy}>{busy?t('search.searching'):'⌕ '+t('search.button')}</button>
    </form>
    {error&&<div className="form-error" role="alert">{error}</div>}
    <section aria-live="polite" aria-busy={busy} className="search-results">
      {searched&&<div className="section-header"><h2>{t('search.results',{query:lastQuery})}</h2><span>{t('search.count',{count:hits.length})} {hits.length===30?t('search.limit'):''}</span></div>}
      {searched&&hits.length===0&&<div className="search-empty">{t('search.none')}</div>}
      {hits.map(hit=><Link className="search-hit" key={hit.chapterId} href={'/books/'+hit.bookId+'/chapters/'+hit.chapterId}>
        <span className="search-hit-book">{hit.bookTitle}</span>
        <strong>{hit.chapterTitle}</strong>
        <span className="search-hit-snippet">{hit.snippet}</span>
        <small>{t('search.resultRevision',{count:hit.revision})}</small>
      </Link>)}
      {!searched&&!busy&&<div className="search-empty">{t('search.privacy')}</div>}
    </section>
  </div>;
}
