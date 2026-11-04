'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import ActionMenu from './ActionMenu';
import BookActionsMenu from './BookActionsMenu';
import ManuscriptImportDialog from './ManuscriptImportDialog';
import AppIcon from './AppIcon';
import {useAppPreferences,usePreferenceActions} from './AppPreferences';
import {useToast} from './ToastProvider';
import {explainActionError} from '@/lib/notification-copy';
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
  const {notify}=useToast();
  const prefs=usePreferenceActions();
  const [creating,setCreating]=useState(false),[importing,setImporting]=useState(false),[title,setTitle]=useState(''),
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
      if(!response.ok){const detail=explainActionError({locale,operation:'book-create',status:response.status,code:result.error});
        setError(detail);notify({tone:'error',title:locale==='fr'?'Création du livre refusée':'Book creation refused',detail});return;}
      notify({tone:'success',title:locale==='fr'?'Livre créé':'Book created',
        detail:locale==='fr'?'« '+title+' » a été ajouté à votre bibliothèque privée.':
          '“'+title+'” was added to your private library.'});
      router.push('/books/'+result.book.id);router.refresh();
    }catch{const detail=explainActionError({locale,operation:'book-create',status:0});setError(detail);
      notify({tone:'error',title:locale==='fr'?'Création du livre interrompue':'Book creation interrupted',detail});}
    finally{setLoading(false);}
  }

  return <div className="workspace"><aside className="nav">
    <div className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></div>
    <div className="nav-section">{t('library.mySpace')}</div>
    <Link className="nav-link active" href="/library" aria-current="page"><AppIcon name="library"/><span>{t('common.library')}</span></Link>
    <Link className="nav-link" href="/search"><AppIcon name="search"/><span>{t('common.search')}</span></Link>
    <Link className="nav-link" href="/library/archives"><AppIcon name="archive"/><span>{t('common.archives')}</span></Link>
    <span className="nav-link subdued"><AppIcon name="template"/><span>{t('library.models')}</span><small className="soon">{t('library.soon')}</small></span>
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
      <div className="library-primary-actions">
        <button type="button" className="button library-import-button" onClick={()=>setImporting(true)}>
          <AppIcon name="upload"/>{t('library.importManuscript')}
        </button>
        <button type="button" className="button" onClick={()=>{setBookLanguage(locale);setCreating(true)}}>
          <AppIcon name="plus"/>{t('library.newBook')}
        </button>
      </div>
    </div>
    <div className="stat-row"><div><strong>{books.length}</strong><span>{t('common.books')}</span></div>
      <div><strong>{books.filter(book=>book.status==='WRITING').length}</strong><span>{t('library.writing')}</span></div>
      <div><strong>{books.filter(book=>book.status==='REVIEW').length}</strong><span>{t('library.review')}</span></div>
    </div>
    <div className="section-header"><h2><AppIcon name="book"/>{t('library.myWorks')}</h2>
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
      <button type="button" className="new-book-card import-book-card" onClick={()=>setImporting(true)}>
        <span className="import-card-glyph"><AppIcon name="upload" size={26}/></span>
        <strong>{t('library.importManuscript')}</strong><small>{t('library.importHint')}</small>
      </button>
      <button type="button" className="new-book-card" onClick={()=>{setBookLanguage(locale);setCreating(true)}}>
        <span>＋</span><strong>{t('library.start')}</strong><small>{t('library.fromScratch')}</small>
      </button>
    </div></div>
  </main>
  {importing&&<ManuscriptImportDialog books={books.filter(book=>book.editable).map(book=>({id:book.id,title:book.title}))}
    onClose={()=>setImporting(false)}
    onCreateBook={()=>{setImporting(false);setBookLanguage(locale);setCreating(true);}}
    onUploaded={bookId=>{setImporting(false);router.push('/books/'+bookId+'#book-source-files');router.refresh();}}/>}
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
