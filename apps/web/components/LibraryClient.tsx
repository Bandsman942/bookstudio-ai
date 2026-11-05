'use client';
import {useEffect,useRef,useState} from 'react';
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

type Book={id:string;title:string;bookType:string;language:string;status:string;updatedAt:string;editable:boolean};
const milestones=['DRAFT','WRITING','REVIEW','APPROVED','PRODUCTION','PUBLISHED'] as const;
type Milestone=typeof milestones[number];
type Counters={total:number;writing:number;review:number;archived:number;
  byStatus:Record<Milestone,number>};
type Filters={q:string;type:string;status:string;sort:'recent'|'title'};
type Page={books:Book[];nextCursor:string|null;total:number;stats:Counters};
const emptyFilters:Filters={q:'',type:'',status:'',sort:'recent'};
const bookTypes:{value:string;key:MessageKey}[]=[
  {value:'GENERAL',key:'library.kindGeneral'},
  {value:'NOVEL',key:'library.kindNovel'},
  {value:'ESSAY',key:'library.kindEssay'},
  {value:'SCIENCE',key:'library.kindScience'},
  {value:'MEDICINE',key:'library.kindMedicine'},
  {value:'EDUCATION',key:'library.kindEducation'},
];

export default function LibraryClient({books,displayName,initialNextCursor,initialTotal,initialStats}:{
  books:Book[];displayName:string;initialNextCursor:string|null;initialTotal:number;initialStats:Counters
}){
  const {t,locale}=useAppPreferences();
  const {notify}=useToast();
  const prefs=usePreferenceActions();
  const [creating,setCreating]=useState(false),[importing,setImporting]=useState(false),[title,setTitle]=useState(''),
    [kind,setKind]=useState('GENERAL'),[bookLanguage,setBookLanguage]=useState<Locale>(locale),
    [loading,setLoading]=useState(false),[error,setError]=useState('');
  const [items,setItems]=useState(books),[nextCursor,setNextCursor]=useState(initialNextCursor),
    [visibleTotal,setVisibleTotal]=useState(initialTotal),[stats,setStats]=useState(initialStats);
  const [query,setQuery]=useState(''),[filterType,setFilterType]=useState(''),
    [filterStatus,setFilterStatus]=useState(''),[sort,setSort]=useState<'recent'|'title'>('recent');
  const [applied,setApplied]=useState<Filters>(emptyFilters),[listBusy,setListBusy]=useState(false),
    [listError,setListError]=useState('');
  const sequence=useRef(0),abort=useRef<AbortController|null>(null);
  useEffect(()=>{
    // A router.refresh from book metadata/archive actions resets stale pages.
    sequence.current++;abort.current?.abort();
    setItems(books);setNextCursor(initialNextCursor);setVisibleTotal(initialTotal);
    setStats(initialStats);setApplied(emptyFilters);setQuery('');setFilterType('');
    setFilterStatus('');setSort('recent');setListBusy(false);setListError('');
  },[books,initialNextCursor,initialTotal,initialStats]);
  useEffect(()=>()=>abort.current?.abort(),[]);
  const router=useRouter();
  const fmt=locale==='fr'?'fr-FR':'en-US';
  const typeLabel=(type:string)=>t(bookTypes.find(x=>x.value===type)?.key??'library.kindGeneral');
  const statusLabel=(status:string)=>status==='DRAFT'?t('library.draft'):
    status==='WRITING'?t('library.writing'):status==='REVIEW'?t('library.review'):
    status==='APPROVED'?(locale==='fr'?'Approuvé':'Approved'):
    status==='PRODUCTION'?(locale==='fr'?'En production éditoriale':'Editorial production'):
    status==='PUBLISHED'?(locale==='fr'?'Publié (déclaré)':'Published (declared)'):status;
  async function loadPage(filters:Filters,cursor:string|null){
    if(listBusy&&cursor)return;
    const seq=++sequence.current;abort.current?.abort();
    const controller=new AbortController();abort.current=controller;
    setListBusy(true);setListError('');
    const params=new URLSearchParams({limit:'24',sort:filters.sort});
    if(filters.q)params.set('q',filters.q);
    if(filters.type)params.set('type',filters.type);
    if(filters.status)params.set('status',filters.status);
    if(cursor)params.set('cursor',cursor);
    try{
      const response=await fetch('/api/v1/books?'+params.toString(),{
        method:'GET',cache:'no-store',signal:controller.signal
      });
      const payload=await response.json().catch(()=>({})) as Page;
      if(seq!==sequence.current)return;
      if(!response.ok||!Array.isArray(payload.books)||!payload.stats)
        throw Error('LIBRARY_PAGE_UNAVAILABLE');
      setItems(old=>cursor?[...old,...payload.books.filter(next=>
        !old.some(prev=>prev.id===next.id))]:payload.books);
      setNextCursor(payload.nextCursor??null);
      setVisibleTotal(payload.total);setStats(payload.stats);setApplied(filters);
    }catch{
      if(controller.signal.aborted||seq!==sequence.current)return;
      const detail=locale==='fr'?
        'La bibliothèque ne peut pas charger ces résultats. Vérifiez votre connexion et réessayez ; vos livres restent enregistrés.':
        'The library could not load those results. Check your connection and retry; your saved books are unchanged.';
      setListError(detail);
      notify({tone:'error',title:locale==='fr'?'Chargement de la bibliothèque interrompu':'Library loading interrupted',detail});
    }finally{
      if(seq===sequence.current)setListBusy(false);
    }
  }
  function submitFilters(event:React.FormEvent){
    event.preventDefault();void loadPage({q:query.trim(),type:filterType,status:filterStatus,sort},null);
  }
  function applyMilestone(status:Milestone){
    setFilterStatus(status);
    void loadPage({q:query.trim(),type:filterType,status,sort},null);
  }
  function resetFilters(){
    setQuery('');setFilterType('');setFilterStatus('');setSort('recent');
    void loadPage(emptyFilters,null);
  }
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
    <div className="stat-row"><div><strong>{stats.total}</strong><span>{t('common.books')}</span></div>
      <div><strong>{stats.writing}</strong><span>{t('library.writing')}</span></div>
      <div><strong>{stats.review}</strong><span>{t('library.review')}</span></div>
    </div>
    <section className="library-editorial-overview" aria-label={
      locale==='fr'?'Pilotage des étapes éditoriales':'Editorial workflow dashboard'}>
      <div className="section-header">
        <h2>{locale==='fr'?'Pilotage éditorial':'Editorial overview'}</h2>
        <span>{locale==='fr'?'Toutes les œuvres autorisées':'All accessible works'}</span>
      </div>
      <div className="library-milestone-grid">
        {milestones.map(stage=><button key={stage} type="button"
          className="library-milestone-card" disabled={listBusy}
          aria-pressed={applied.status===stage}
          onClick={()=>applyMilestone(stage)}>
          <strong>{stats.byStatus[stage]??0}</strong>
          <span>{statusLabel(stage)}</span>
        </button>)}
        <Link className="library-milestone-card" href="/library/archives">
          <strong>{stats.archived}</strong>
          <span>{locale==='fr'?'Ouvrages archivés':'Archived books'}</span>
        </Link>
      </div>
      <p className="source-note">{locale==='fr'?
        'Ces indicateurs couvrent toute votre bibliothèque autorisée, pas uniquement les cartes affichées. Sélectionnez une étape pour filtrer.':
        'These figures cover all your accessible books, not just visible cards. Select a milestone to filter.'}</p>
    </section>
    <form className="library-filters" role="search" onSubmit={submitFilters}
      aria-label={locale==='fr'?'Filtrer les ouvrages':'Filter books'}>
      <label className="library-search-label"><span>{locale==='fr'?'Rechercher un titre':'Search title'}</span>
        <input type="search" value={query} maxLength={80} disabled={listBusy}
          onChange={event=>setQuery(event.target.value)}
          placeholder={locale==='fr'?'Titre de l’ouvrage…':'Book title…'}/>
      </label>
      <label><span>{locale==='fr'?'Type':'Type'}</span>
        <select value={filterType} onChange={event=>setFilterType(event.target.value)} disabled={listBusy}>
          <option value="">{locale==='fr'?'Tous les types':'All types'}</option>
          {bookTypes.map(option=><option key={option.value} value={option.value}>{t(option.key)}</option>)}
        </select>
      </label>
      <label><span>{locale==='fr'?'Étape':'Milestone'}</span>
        <select value={filterStatus} onChange={event=>setFilterStatus(event.target.value)} disabled={listBusy}>
          <option value="">{locale==='fr'?'Toutes les étapes':'All milestones'}</option>
          {['DRAFT','WRITING','REVIEW','APPROVED','PRODUCTION','PUBLISHED'].map(value=>
            <option key={value} value={value}>{statusLabel(value)}</option>)}
        </select>
      </label>
      <label><span>{locale==='fr'?'Tri':'Sort'}</span>
        <select value={sort} onChange={event=>setSort(event.target.value as 'recent'|'title')} disabled={listBusy}>
          <option value="recent">{locale==='fr'?'Modification récente':'Recently updated'}</option>
          <option value="title">{locale==='fr'?'Titre A–Z':'Title A–Z'}</option>
        </select>
      </label>
      <div className="library-filter-actions">
        <button className="button" type="submit" disabled={listBusy}>
          {listBusy?(locale==='fr'?'Chargement…':'Loading…'):
            (locale==='fr'?'Appliquer':'Apply')}
        </button>
        <button className="text-button" type="button" onClick={resetFilters} disabled={listBusy}>
          {locale==='fr'?'Réinitialiser':'Reset'}
        </button>
      </div>
    </form>
    {listError&&<p role="alert" className="form-error">{listError}</p>}
    <div className="section-header"><h2><AppIcon name="book"/>{t('library.myWorks')}</h2>
      <span role="status" aria-live="polite">{items.length} / {visibleTotal} {
        locale==='fr'?'ouvrages affichés':'books displayed'
      }</span></div>
    {items.length===0&&<p className="library-empty" role="status">{
      locale==='fr'?'Aucun ouvrage ne correspond à ces critères. Essayez un autre filtre.':
        'No books match these filters. Try another search.'
    }</p>}
    <div className="book-grid" aria-busy={listBusy}>
      {items.map((book,index)=><article key={book.id} className="book-card">
        <Link href={'/books/'+book.id} className="book-card-link" aria-label={t('library.openBook',{title:book.title})}>
          <div className={'cover cover-'+(index%4)}><span>BOOKSTUDIO</span><strong>{book.title}</strong><small>by DTSC</small></div>
          <div className="book-meta"><h3>{book.title}</h3>
            <p>{typeLabel(book.bookType)} · {book.language.toUpperCase()} · {t('common.modified')} {new Date(book.updatedAt).toLocaleDateString(fmt)}</p>
            <span className="status">{statusLabel(book.status)}</span>
          </div>
        </Link>
        <div className="book-card-overflow"><BookActionsMenu bookId={book.id} title={book.title}
          updatedAt={book.updatedAt} bookType={book.bookType} language={book.language}
          status={book.status} editable={book.editable} showOpen onArchive="refresh"/></div>
      </article>)}
      <button type="button" className="new-book-card import-book-card" onClick={()=>setImporting(true)}>
        <span className="import-card-glyph"><AppIcon name="upload" size={26}/></span>
        <strong>{t('library.importManuscript')}</strong><small>{t('library.importHint')}</small>
      </button>
      <button type="button" className="new-book-card" onClick={()=>{setBookLanguage(locale);setCreating(true)}}>
        <span>＋</span><strong>{t('library.start')}</strong><small>{t('library.fromScratch')}</small>
      </button>
    </div>
    {nextCursor&&<div className="library-load-more">
      <button type="button" className="button" disabled={listBusy}
        onClick={()=>void loadPage(applied,nextCursor)}>
        {listBusy?(locale==='fr'?'Chargement…':'Loading…'):
          (locale==='fr'?'Afficher davantage d’ouvrages':'Load more books')}
      </button>
    </div>}
    </div>
  </main>
  {importing&&<ManuscriptImportDialog books={items.filter(book=>book.editable).map(book=>({id:book.id,title:book.title}))}
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
