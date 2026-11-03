'use client';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useState} from 'react';
import ActionMenu from './ActionMenu';
import {useAppPreferences} from './AppPreferences';

type Archived={id:string;title:string;bookType:string;updatedAt:string;canRestore:boolean};
export default function ArchivesClient({books,displayName}:{books:Archived[];displayName:string}){
 const {t,locale}=useAppPreferences();
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
     setError(result.status===409?t('archives.conflict'):data.error||t('archives.restoreError'));
     return;
   }
   router.refresh();
  }catch{setError(t('archives.networkError'));}
  finally{setBusyId(null);}
 }
 return <div className="workspace">
   <aside className="nav"><Link href="/library" className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
   <div className="nav-section">{t('library.mySpace')}</div>
   <Link className="nav-link" href="/library">▦ {t('common.library')}</Link>
   <Link className="nav-link" href="/search">⌕ {t('common.search')}</Link>
   <Link className="nav-link active" href="/library/archives" aria-current="page">▤ {t('common.archives')}</Link>
   <div className="nav-spacer"/><div className="nav-user"><span className="avatar">{displayName.charAt(0).toUpperCase()}</span>{displayName}</div>
   </aside>
   <main className="content">
    <header className="content-top"><span className="breadcrumb"><Link href="/library" >{t('library.mySpace')}</Link> / <strong>{t('common.archives')}</strong></span><span className="save-badge">● {t('archives.private')}</span></header>
    <div className="content-inner"><div className="eyebrow">{t('archives.eyebrow')}</div><h1>{t('archives.title')}<span className="dot">.</span></h1>
     <p>{t('archives.intro')}</p>
     <div className="section-header"><h2>{t('archives.books')}</h2><span>{books.length} {t('common.books')}</span></div>
     {error&&<p className="form-error" role="alert">{error}</p>}
     {books.length===0?<div className="search-empty">{t('archives.none')} <Link href="/library">{t('archives.return')}</Link></div>:
     <div className="archive-list">{books.map(book=><div className="archive-item" key={book.id}>
       <div><strong>{book.title}</strong><small>{t('archives.modified',{date:new Date(book.updatedAt).toLocaleDateString(locale==='fr'?'fr-FR':'en-US')})}</small></div>
       {book.canRestore?
         <ActionMenu label={t('archives.actionsFor',{title:book.title})} disabled={busyId!==null} actions={[
           {label:t('archives.restore'),onSelect:()=>void restore(book)}
         ]}/>:
         <span className="status">{t('common.readOnly')}</span>}
     </div>)}</div>}
    </div>
   </main>
 </div>;
}
