'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import ActionMenu from './ActionMenu';
import BookActionsMenu from './BookActionsMenu';
import {useAppPreferences,usePreferenceActions} from './AppPreferences';
import type {Locale,MessageKey} from '@/lib/i18n';

type Book={id:string;title:string;bookType:string;status:string;updatedAt:string;editable:boolean};
const bookTypes:{value:string;key:MessageKey}[]=[
  {value:'GENERAL',key:'library.kindGeneral'},
  {value:'NOVEL',key:'library.kindNovel'},
  {value:'ESSAY',key:'library.kindEssay'},
  {value:'SCIENCE',key:'library.kindScience'},
  {value:'MEDICINE',key:'library.kindMedicine'},
  {value:'EDUCATION',key:'library.kindEducation'},
];

export default function LibraryClient({books,displayName}:{books:Book[];displayName:string}){
  const {t,locale}=useAppPreferences();
  const prefs=usePreferenceActions();
  const [creating,setCreating]=useState(false),[title,setTitle]=useState(''),
    [kind,setKind]=useState('GENERAL'),[bookLanguage,setBookLanguage]=useState<Locale>(locale),
    [loading,setLoading]=useState(false),[error,setError]=useState('');
  const router=useRouter();
  const fmt=locale==='fr'?'fr-FR':'en-US';
  const typeLabel=(type:string)=>t(bookTypes.find(x=>x.value===type)?.key??'library.kindGeneral');
  const statusLabel=(status:string)=>status==='DRAFT'?t('library.draft'):status==='WRITING'?t('library.writing'):status==='REVIEW'?t('library.review'):status;
  async function create(event:React.FormEvent){
    event.preventDefault();setError('');setLoading(true);
    try{
      const response=await fetch('/api/v1/books',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({title,bookType:kind,language:bookLanguage})});
      const result=await response.json();
      if(!response.ok){setError(result.error||t('library.createFailed'));return;}
      router.push('/books/'+result.book.id);router.refresh();
    }catch{setError(t('library.noConnection'));}
    finally{setLoading(false);}
  }

  return <div className="workspace"><aside className="nav">
    <div className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></div>
    <div className="nav-section">{t('library.mySpace')}</div>
    <Link className="nav-link active" href="/library">▦ {t('common.library')}</Link>
    <Link className="nav-link" href="/search">⌕ {t('common.search')}</Link>
    <Link className="nav-link" href="/library/archives">▤ {t('common.archives')}</Link>
    <span className="nav-link subdued">▤ {t('library.models')} <small className="soon">{t('library.soon')}</small></span>
    <div className="nav-spacer"/>
    <div className="nav-user"><span className="avatar">{displayName.charAt(0).toUpperCase()}</span>
      <span>{displayName}<small>{t('common.author')}</small></span></div>
  </aside>
  <main className="content">
    <header className="content-top"><span className="breadcrumb">{t('library.mySpace')} / <strong>{t('common.library')}</strong></span>
      <ActionMenu label={t('prefs.account')} actions={[
        {label:t('common.search'),href:'/search'},
        {label:t('common.archives'),href:'/library/archives'},
        ...prefs,
        {label:t('common.logout'),separatorBefore:true,onSelect:async()=>{
          await fetch('/api/v1/auth/logout',{method:'POST'});
          router.push('/login');router.refresh();
        }}
      ]}/>
    </header>
    <div className="content-inner"><div className="title-row">
      <div><span className="eyebrow">{t('library.myWorkshop')}</span>
        <h1>{t('library.myLibrary')}<span className="dot">.</span></h1><p>{t('library.subtitle')}</p></div>
      <button type="button" className="button" onClick={()=>{setBookLanguage(locale);setCreating(true)}}>
        ＋ {t('library.newBook')}
      </button>
    </div>
    <div className="stat-row"><div><strong>{books.length}</strong><span>{t('common.books')}</span></div>
      <div><strong>{books.filter(book=>book.status==='WRITING').length}</strong><span>{t('library.writing')}</span></div>
      <div><strong>{books.filter(book=>book.status==='REVIEW').length}</strong><span>{t('library.review')}</span></div>
    </div>
    <div className="section-header"><h2>{t('library.myWorks')}</h2>
      <span>{books.length} {t(books.length===1?'library.project':'library.projects')}</span></div>
    <div className="book-grid">
      {books.map((book,index)=><article key={book.id} className="book-card">
        <Link href={'/books/'+book.id} className="book-card-link" aria-label={t('library.openBook',{title:book.title})}>
          <div className={'cover cover-'+(index%4)}><span>BOOKSTUDIO</span><strong>{book.title}</strong><small>by DTSC</small></div>
          <div className="book-meta"><h3>{book.title}</h3>
            <p>{typeLabel(book.bookType)} · {t('common.modified')} {new Date(book.updatedAt).toLocaleDateString(fmt)}</p>
            <span className="status">{statusLabel(book.status)}</span>
          </div>
        </Link>
        <div className="book-card-overflow"><BookActionsMenu bookId={book.id} title={book.title}
          updatedAt={book.updatedAt} editable={book.editable} showOpen onArchive="refresh"/></div>
      </article>)}
      <button type="button" className="new-book-card" onClick={()=>{setBookLanguage(locale);setCreating(true)}}>
        <span>＋</span><strong>{t('library.start')}</strong><small>{t('library.fromScratch')}</small>
      </button>
    </div></div>
  </main>
  {creating&&<div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setCreating(false)}}>
    <form className="modal" onSubmit={create} role="dialog" aria-modal="true" aria-label={t('library.newWork')}>
      <button type="button" className="close" aria-label={t('common.close')} onClick={()=>setCreating(false)}>×</button>
      <div className="eyebrow">{t('library.newWork')}</div><h2>{t('library.startTitle')}</h2>
      <p>{t('library.startText')}</p>
      <label>{t('library.bookTitle')}<input autoFocus required minLength={2} maxLength={180}
        value={title} onChange={event=>setTitle(event.target.value)} placeholder={t('library.bookTitlePlaceholder')}/></label>
      <label>{t('library.kind')}
        <select value={kind} onChange={event=>setKind(event.target.value)}>
          {bookTypes.map(x=><option value={x.value} key={x.value}>{t(x.key)}</option>)}
        </select>
      </label>
      <label>{t('library.manuscriptLanguage')}
        <select value={bookLanguage} onChange={event=>setBookLanguage(event.target.value as Locale)}>
          <option value="fr">{t('prefs.fr')}</option><option value="en">{t('prefs.en')}</option>
        </select>
      </label>
      {error&&<div role="alert" className="form-error">{error}</div>}
      <button disabled={loading} className="button full">{t(loading?'library.creating':'library.create')}</button>
    </form>
  </div>}
  </div>;
}
