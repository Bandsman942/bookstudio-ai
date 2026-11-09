'use client';

import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import SnapshotsPanel from './SnapshotsPanel';
import BookSourceFiles from './BookSourceFiles';
import BookActionsMenu from './BookActionsMenu';
import ChapterActionsMenu from './ChapterActionsMenu';
import ChapterTrash from './ChapterTrash';
import ShortcutsHelp from './ShortcutsHelp';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {explainActionError} from '@/lib/notification-copy';
import AppIcon from './AppIcon';
import type {BookProgress} from '@/lib/book-progress';
import BookEditionsPanel from './BookEditionsPanel';
import BookOutline from './BookOutline';
import BookPartsPanel,{type BookPart} from './BookPartsPanel';

type Chapter={id:string;title:string;revision:number;updatedAt:string;partId:string|null};
type Props={
  bookId:string;title:string;status:string;kind:string;language:string;
  chapters:Chapter[];updatedAt:string;editable:boolean;orderToken:string;
  progress:BookProgress|null;editionId:string;parts:BookPart[]
};

export default function BookOverview({bookId,title,status,kind,language,chapters,updatedAt,editable,orderToken,progress,editionId,parts}:Props){
  const {t,locale}=useAppPreferences();
  const {notify}=useToast();
  const [newTitle,setNewTitle]=useState(''),[showForm,setShowForm]=useState(false),
        [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const router=useRouter();
  const chapterText=new Map(progress?.chapterStates.map(s=>[s.chapterId,s.hasText])??[]);
  const formatDate=(value:string)=>new Intl.DateTimeFormat(locale==='fr'?'fr-FR':'en-US',
    {dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      const target=event.target instanceof Element?event.target:null;
      const typing=!!target?.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]');
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='n'&&editable){
        event.preventDefault();setShowForm(true);
      }else if(event.key==='?'&&!typing&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
        event.preventDefault();document.dispatchEvent(new Event('bookstudio-shortcuts-open'));
      }
    };
    document.addEventListener('keydown',key);return ()=>document.removeEventListener('keydown',key);
  },[editable]);
  async function add(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');
    try{
      const response=await fetch('/api/v1/books/'+bookId+'/chapters',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newTitle})
      });
      const payload=await response.json();
      if(!response.ok){const detail=explainActionError({locale,operation:'chapter-create',status:response.status,code:payload.error});
        setError(detail);notify({tone:'error',title:locale==='fr'?'Chapitre non créé':'Chapter not created',detail});return;}
      notify({tone:'success',title:locale==='fr'?'Chapitre créé':'Chapter created',
        detail:locale==='fr'?'« '+newTitle+' » a été ajouté à l’ouvrage « '+title+' ».':
          '“'+newTitle+'” was added to “'+title+'”.'});
      router.push('/books/'+bookId+'/chapters/'+payload.chapter.id);
      router.refresh();
    }catch{const detail=explainActionError({locale,operation:'chapter-create',status:0});setError(detail);
      notify({tone:'error',title:locale==='fr'?'Création du chapitre interrompue':'Chapter creation interrupted',detail});}
    finally{setBusy(false);}
  }
  return <div className="content-inner">
    <span className="eyebrow">{t('book.projectOverview')}</span>
    <div className="book-title-actions">
      <div><h1>{title}<span className="dot">.</span></h1><p>{t('book.overviewSubtitle')}</p></div>
      <div className="book-header-actions">
        <Link className="button small secondary" href={'/search?bookId='+bookId}>
          <AppIcon name="search"/>{locale==='fr'?'Rechercher dans ce livre':'Search this book'}
        </Link>
        {editable&&<>
          <a className="button small" href="#book-source-files"><AppIcon name="upload"/>{t('book.importManuscript')}</a>
          <BookActionsMenu bookId={bookId} title={title} updatedAt={updatedAt}
            bookType={kind} language={language} status={status} editable onArchive="library"/>
        </>}
      </div>
    </div>
    <BookSourceFiles bookId={bookId} editable={editable}/>
    <div className="overview-cards">
      <div><span>{t('book.chapters')}</span><strong>{chapters.length}</strong><small>{t('book.organized')}</small></div>
      <div><span>{t('book.status')}</span><strong className="status-label">{status==='DRAFT'?t('library.draft'):status==='WRITING'?t('library.writing'):status==='REVIEW'?t('library.review'):status}</strong><small>{t('book.historySaved')}</small></div>
      <div><span>{t('book.type')}</span><strong className="status-label">{kind==='NOVEL'?t('library.kindNovel'):kind==='MEDICINE'?t('library.kindMedicine'):kind==='SCIENCE'?t('library.kindScience'):kind==='EDUCATION'?t('library.kindEducation'):kind==='ESSAY'?t('library.kindEssay'):t('library.kindGeneral')}</strong><small>{language.toUpperCase()} · {t('book.customizable')}</small></div>
    </div>
    <section className="book-progress-panel" id="book-progress" aria-label={
      locale==='fr'?'Progression rédactionnelle du livre':'Book writing activity'}>
      <div className="section-header">
        <h2><AppIcon name="chart"/>{locale==='fr'?'Progression du manuscrit':'Manuscript progress'}</h2>
        <span>{locale==='fr'?'Données enregistrées':'Saved data only'}</span>
      </div>
      {progress?<>
        <div className="book-progress-meter">
          <div className="book-progress-meter-label">
            <strong>{progress.writingCoveragePercent}%</strong>
            <span>{locale==='fr'?'de chapitres contenant du texte':'of chapters containing text'}</span>
          </div>
          <progress value={progress.writingCoveragePercent} max={100}
            aria-label={locale==='fr'?'Proportion de chapitres contenant du texte':
              'Proportion of chapters with text'}/>
          <p className="source-note">{locale==='fr'?
            'Cette proportion mesure la présence de texte enregistré, pas la qualité ni l’achèvement éditorial.':
            'This measures saved text presence, not writing quality or editorial completion.'}</p>
        </div>
        <div className="book-progress-stats">
          <div><strong>{progress.activeChapters}</strong><span>{locale==='fr'?'Chapitres actifs':'Active chapters'}</span></div>
          <div><strong>{progress.writtenChapters}</strong><span>{locale==='fr'?'Avec texte':'With text'}</span></div>
          <div><strong>{progress.emptyChapters}</strong><span>{locale==='fr'?'Encore vides':'Still empty'}</span></div>
          <div><strong>{progress.revisionRecords}</strong><span>{locale==='fr'?'Enregistrements de révision':'Revision records'}</span></div>
          <div><strong>{progress.snapshots}</strong><span>{locale==='fr'?'Versions nommées':'Named snapshots'}</span></div>
          <div><strong>{progress.removedChapters}</strong><span>{locale==='fr'?'Chapitres retirés':'Removed chapters'}</span></div>
        </div>
        {progress.latestChapter&&<p className="book-progress-activity">
          <span>{locale==='fr'?'Dernier chapitre modifié':'Last changed chapter'} :</span>
          <Link href={'/books/'+bookId+'/chapters/'+progress.latestChapter.id}>
            {progress.latestChapter.title}
          </Link>
          <time dateTime={progress.latestChapter.updatedAt}>
            {formatDate(progress.latestChapter.updatedAt)}
          </time>
        </p>}
        {progress.lastRevisionAt&&<p className="source-note">
          {locale==='fr'?'Dernière révision enregistrée : ':'Last saved revision: '}
          <time dateTime={progress.lastRevisionAt}>{formatDate(progress.lastRevisionAt)}</time>
        </p>}
        <div className="book-progress-links">
          <a href="#book-structure">{locale==='fr'?'Voir les chapitres':'See chapters'}</a>
          <a href="#book-versions">{locale==='fr'?'Ouvrir les versions':'Open versions'}</a>
        </div>
      </>:<p className="source-note" role="status">
        {locale==='fr'?'Les indicateurs sont temporairement indisponibles. Votre manuscrit reste accessible et modifiable.':
          'Progress figures are temporarily unavailable. Your manuscript remains accessible and editable.'}
      </p>}
    </section>
    <BookPartsPanel bookId={bookId} editionId={editionId} parts={parts}
      chapters={chapters.map(c=>({id:c.id,title:c.title,partId:c.partId,updatedAt:c.updatedAt}))}
      editable={editable}/>
    <BookOutline bookId={bookId} chapters={chapters} parts={parts}/>
    <div className="section-header" id="book-structure"><h2><AppIcon name="chapter"/>{t('book.structure')}</h2>
      {editable&&<button className="button small" type="button" onClick={()=>setShowForm(true)}><AppIcon name="plus"/>{t('book.chapterAdd')}</button>}
    </div>
    <div className="chapter-list">{chapters.map((chapter,index)=><div key={chapter.id} className="chapter-item">
      <Link href={'/books/'+bookId+'/chapters/'+chapter.id} className="chapter-item-link">
        <span className="chapter-num">{String(index+1).padStart(2,'0')}</span>
        <div><strong>{chapter.title}</strong><small>{t('book.chapterRevision',{count:chapter.revision})}</small>
          {progress&&<small className={'chapter-text-badge '+(chapterText.get(chapter.id)?'has-text':'is-empty')}>
            {chapterText.get(chapter.id)?
              (locale==='fr'?'Texte enregistré':'Saved text'):
              (locale==='fr'?'Pas encore de texte':'No text yet')}
          </small>}
        </div>
        <AppIcon name="chevronRight" className="chapter-arrow"/>
      </Link>
      <ChapterActionsMenu bookId={bookId} chapterId={chapter.id} title={chapter.title}
        updatedAt={chapter.updatedAt} revision={chapter.revision} editable={editable}
        reorder={{token:orderToken,index,total:chapters.length}}/>
    </div>)}</div>
    {editable&&<ChapterTrash bookId={bookId}/>}
    <BookEditionsPanel bookId={bookId} editable={editable}/>
    <SnapshotsPanel bookId={bookId} editable={editable}/>
    <ShortcutsHelp/>
    {showForm&&<div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setShowForm(false);}}>
      <form className="modal" onSubmit={add} role="dialog" aria-modal="true" aria-label={t('book.newChapter')}>
        <button className="close" type="button" aria-label={t('common.close')} onClick={()=>setShowForm(false)}>×</button>
        <div className="eyebrow">{t('book.newChapter')}</div><h2>{t('book.newChapterTitle')}</h2>
        <label>{t('book.chapterName')}<input autoFocus required minLength={2} maxLength={180}
          value={newTitle} onChange={event=>setNewTitle(event.target.value)}
          placeholder={t('book.chapterPlaceholder')}/></label>
        {error&&<p role="alert" className="form-error">{error}</p>}
        <button className="button full" disabled={busy}>{t(busy?'book.chapterCreating':'book.chapterCreate')}</button>
      </form>
    </div>}
  </div>;
}
