'use client';
import {useEffect,useRef,useState} from 'react';
import {EditorContent,useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {safeExternalHref} from '@bookstudio/domain';
import EditorRibbon from './EditorRibbon';
import AppIcon from './AppIcon';
import Link from 'next/link';
import ChapterComments from './ChapterComments';
import ActionMenu from './ActionMenu';
import {useAppPreferences,usePreferenceActions} from './AppPreferences';
import {useToast} from './ToastProvider';
type Chapter={id:string;title:string};
type SaveState='saved'|'editing'|'saving'|'conflict'|'error'|'offline';
type Props={bookId:string;bookTitle:string;chapterId:string;chapterTitle:string;revision:number;initialContent:Record<string,unknown>;chapters:Chapter[];canEdit:boolean};
export default function StudioEditor({bookId,bookTitle,chapterId,chapterTitle,revision,initialContent,chapters,canEdit}:Props){
 const {t,locale}=useAppPreferences();
 const preferenceActions=usePreferenceActions();
 const {notify}=useToast();
 const previousSaveState=useRef<SaveState>('saved');
 const hadSaveIssue=useRef(false);
 const currentTRef=useRef(t);currentTRef.current=t;
 const [state,setState]=useState<SaveState>('saved');
 const [currentRevision,setRevision]=useState(revision);
 const [focus,setFocus]=useState(false),[rightPanel,setRightPanel]=useState(true),[compact,setCompact]=useState<boolean|null>(null),[mobilePanel,setMobilePanel]=useState(false),[wordCount,setWordCount]=useState(0),[errorDetail,setErrorDetail]=useState('');
 const [recovery,setRecovery]=useState<string|null>(null);
 const revisionRef=useRef(revision),savedContentRef=useRef(JSON.stringify(initialContent)),pendingRef=useRef(false),savingRef=useRef(false),lastJson=useRef(JSON.stringify(initialContent));
 const serializeTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const retryCountRef=useRef(0),retryAtRef=useRef(0),conflictRef=useRef(false);

 useEffect(()=>{
   // Autosave itself is silent; only transitions that require intervention
   // and an eventual recovery trigger one contextual notification.
   const previous=previousSaveState.current;previousSaveState.current=state;
   if(!canEdit||state===previous)return;
   if(state==='conflict'||state==='offline'||state==='error'){
     hadSaveIssue.current=true;
     const detail=errorDetail||(
       locale==='fr'?'Les modifications du chapitre « '+chapterTitle+' » ne sont pas encore enregistrées sur le serveur.':
         'Changes to “'+chapterTitle+'” have not yet been saved on the server.');
     notify({tone:state==='conflict'?'warning':'error',
       title:locale==='fr'?(state==='conflict'?'Conflit de révision du chapitre':
         state==='offline'?'Chapitre hors connexion':'Enregistrement du chapitre à vérifier'):
         (state==='conflict'?'Chapter revision conflict':
         state==='offline'?'Chapter is offline':'Chapter save needs attention'),
       detail,key:'editor-state|'+chapterId+'|'+state,durationMs:state==='offline'?9500:0});
   }else if(state==='saved'&&hadSaveIssue.current){
     hadSaveIssue.current=false;
     notify({tone:'success',title:locale==='fr'?'Enregistrement du chapitre rétabli':'Chapter save recovered',
       detail:locale==='fr'?'« '+chapterTitle+' » est maintenant enregistré à la révision '+revisionRef.current+'.':
         '“'+chapterTitle+'” is now saved at revision '+revisionRef.current+'.',
       key:'editor-recovered|'+chapterId});
   }
 },[state,canEdit,chapterId,chapterTitle,errorDetail,locale,notify]);
 const draftKey='bookstudio:draft:'+chapterId;
 const drawerCloseRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
   const query=window.matchMedia('(max-width: 1150px)');
   const update=()=>{setCompact(query.matches);if(!query.matches)setMobilePanel(false);};
   update();
   query.addEventListener('change',update);
   return ()=>query.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
   if(!mobilePanel)return;
   drawerCloseRef.current?.focus();
   const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')setMobilePanel(false);};
   document.addEventListener('keydown',handler);
   return ()=>document.removeEventListener('keydown',handler);
 },[mobilePanel]);

 const editor=useEditor({
   extensions:[StarterKit.configure({
     link:{openOnClick:false,autolink:false,linkOnPaste:false,
       isAllowedUri:(url:string)=>safeExternalHref(url)!==null}
   })],
   content:initialContent as any,
   editable:canEdit,
   immediatelyRender:false,
   onUpdate:({editor})=>{
     if(!canEdit)return;
     pendingRef.current=true;
     setState(conflictRef.current?'conflict':'editing');
     // Coalesce many keystrokes into one serialization, word-count and local write.
     // Max 350ms between local draft checkpoints even while typing continuously.
     if(serializeTimerRef.current)return;
     serializeTimerRef.current=setTimeout(()=>{
       serializeTimerRef.current=null;
       lastJson.current=JSON.stringify(editor.getJSON());
       setWordCount(editor.getText().trim().split(/\s+/).filter(Boolean).length);
       try{localStorage.setItem(draftKey,lastJson.current);}
       catch{setState('error');setErrorDetail(currentTRef.current('editor.storageUnavailable'));}
     },350);
   }
 });
 useEffect(()=>{
   if(!editor)return;
   setWordCount(editor.getText().trim().split(/\s+/).filter(Boolean).length);
   try{const draft=localStorage.getItem(draftKey);
     if(draft&&draft!==savedContentRef.current){JSON.parse(draft);setRecovery(draft);}
   }catch{}
 },[editor,draftKey]);
 useEffect(()=>{
   function networkDown(){
     if(pendingRef.current){setState('offline');setErrorDetail(currentTRef.current('editor.offlinePending'));}
   }
   function networkUp(){
     retryAtRef.current=0;retryCountRef.current=0;
     if(pendingRef.current&&!conflictRef.current)setState('editing');
   }
   window.addEventListener('offline',networkDown);
   window.addEventListener('online',networkUp);
   return ()=>{window.removeEventListener('offline',networkDown);window.removeEventListener('online',networkUp);};
 },[]);

 useEffect(()=>{
   if(!canEdit)return;
   const id=setInterval(async()=>{
     if(!pendingRef.current||savingRef.current||conflictRef.current||serializeTimerRef.current)return;
     if(typeof navigator!=='undefined'&&!navigator.onLine){
       setState('offline');
       setErrorDetail(currentTRef.current('editor.offlineSaved'));
       return;
     }
     if(Date.now()<retryAtRef.current)return;
     if(lastJson.current===savedContentRef.current){pendingRef.current=false;setState('saved');return;}
     const snapshot=lastJson.current,baseRevision=revisionRef.current;
     pendingRef.current=false;savingRef.current=true;setState('saving');
     const controller=new AbortController();
     const timeout=setTimeout(()=>controller.abort(),20_000);
     try{
       const response=await fetch('/api/v1/books/'+bookId+'/chapters/'+chapterId,{
         method:'PATCH',headers:{'Content-Type':'application/json'},
         body:JSON.stringify({baseRevision,content:JSON.parse(snapshot)}),
         signal:controller.signal
       });
       const body=await response.json().catch(()=>({}));
       if(response.status===409){
         conflictRef.current=true;pendingRef.current=true;
         setState('conflict');
         setErrorDetail(currentTRef.current('editor.conflictDetailed'));
         return;
       }
       if(response.status===401||response.status===403){
         conflictRef.current=true;pendingRef.current=true;
         setState('error');
         setErrorDetail(currentTRef.current('editor.sessionExpired'));
         return;
       }
       if(!response.ok||!Number.isSafeInteger(body.revision)||body.revision!==baseRevision+1){
         pendingRef.current=true;retryCountRef.current+=1;
         retryAtRef.current=Date.now()+Math.min(30_000,2_000*2**Math.min(4,retryCountRef.current-1));
         setState('error');
         setErrorDetail(currentTRef.current('editor.retry'));
         return;
       }
       retryCountRef.current=0;retryAtRef.current=0;
       revisionRef.current=body.revision;setRevision(body.revision);
       savedContentRef.current=snapshot;
       if(pendingRef.current||serializeTimerRef.current||lastJson.current!==snapshot){pendingRef.current=true;setState('editing');}
       else{
         setState('saved');
         try{localStorage.removeItem(draftKey);}catch{}
       }
     }catch{
       pendingRef.current=true;retryCountRef.current+=1;
       retryAtRef.current=Date.now()+Math.min(30_000,2_000*2**Math.min(4,retryCountRef.current-1));
       setState(typeof navigator!=='undefined'&&!navigator.onLine?'offline':'error');
       setErrorDetail(currentTRef.current('editor.connectionRetry'));
     }finally{
       clearTimeout(timeout);
       savingRef.current=false;
     }
   },1_800);
   return ()=>clearInterval(id);
 },[bookId,chapterId,draftKey,canEdit]);

 useEffect(()=>{
   if(!canEdit||!editor)return;
   const flush=()=>{
     if(serializeTimerRef.current){
       clearTimeout(serializeTimerRef.current);serializeTimerRef.current=null;
       try{
         lastJson.current=JSON.stringify(editor.getJSON());
         localStorage.setItem(draftKey,lastJson.current);
       }catch{}
     }
   };
   const handler=(event:BeforeUnloadEvent)=>{
     flush();
     if(pendingRef.current||savingRef.current){event.preventDefault();event.returnValue='';}
   };
   window.addEventListener('beforeunload',handler);
   return ()=>{flush();window.removeEventListener('beforeunload',handler);};
 },[editor,draftKey,canEdit]);


 return <div className={'studio '+(focus?'studio-focus ':'')+(mobilePanel?'studio-mobile-insights-open':'')}>
  <aside className="studio-sidebar">
    <Link href="/library" className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
    <Link href={'/books/'+bookId} className="back-link"><AppIcon name="arrowLeft"/>{t('editor.bookOverview')}</Link>
    <div className="nav-section"><AppIcon name="manuscript"/>{t('editor.manuscript')}</div><div className="studio-book-title">{bookTitle}</div>
    <div className="chapter-navigation">{chapters.map((c,i)=><Link href={'/books/'+bookId+'/chapters/'+c.id} key={c.id} className={'chapter-nav-link '+(c.id===chapterId?'selected':'')}><AppIcon name="chapter" size={16}/><span>{String(i+1).padStart(2,'0')}. {c.title}</span></Link>)}</div>
    <div className="nav-spacer"/><div className="sidebar-footer">{t('editor.sidebarNote')}</div>
  </aside>
  <main className="studio-center">
    <div className="studio-topbar"><span className="breadcrumb"><Link href={'/books/'+bookId}>{bookTitle}</Link> / <strong>{chapterTitle}</strong></span>
      <div className="studio-actions">
        <span className={'save-state save-'+state}>{!canEdit?t('common.readOnly'):state==='saved'?'✓ '+t('editor.saved'):state==='editing'?'● '+t('editor.modified'):state==='saving'?'◌ '+t('editor.saving'):state==='conflict'?'⚠ '+t('editor.conflict'):state==='offline'?'◌ '+t('editor.offlineDraft'):'⚠ '+t('editor.unsaved')}</span>
        <ActionMenu label={t('editor.display')} actions={[
          {label:t(focus?'editor.focusOff':'editor.focusOn'),
            onSelect:()=>setFocus(value=>!value)},
          {label:compact?t(mobilePanel?'editor.panelClose':'editor.panelOn'):t(rightPanel?'editor.panelOff':'editor.panelOn'),
            onSelect:()=>{if(compact)setMobilePanel(value=>!value);else setRightPanel(value=>!value);}},
          ...preferenceActions
        ]}/>
      </div>
    </div>
    <EditorRibbon editor={editor} canEdit={canEdit}/>
    {recovery&&<div role="alert" className="editor-warning">{t('editor.draftRecovery')}
      <button onClick={()=>{try{editor?.commands.setContent(JSON.parse(recovery) as any);setRecovery(null);}catch{setErrorDetail(t('editor.draftUnreadable'));}}}>{t('editor.draftRestore')}</button>
      <button onClick={()=>{setRecovery(null);try{localStorage.removeItem(draftKey)}catch{}}}>{t('editor.draftIgnore')}</button>
    </div>}
    {(state==='conflict'||state==='error'||state==='offline')&&<div className="editor-warning" role="alert">{errorDetail}</div>}
    <div className="editor-scroll"><article className="editor-sheet"><span className="chapter-label">{t('editor.chapterTitle')}</span><h1>{chapterTitle}</h1><div className="editor-rule"/><EditorContent editor={editor} className="prose-editor"/></article></div>
    <div className="editor-status"><span>{t('editor.wordCount',{count:wordCount.toLocaleString(locale==='fr'?'fr-FR':'en-US')})}</span><span>{t('editor.revision',{count:currentRevision})}</span><span>{t('editor.autosave')}</span></div>
  </main>
  {compact&&mobilePanel&&<button type="button" className="studio-insights-backdrop" aria-label={t('editor.panelClose')} onClick={()=>setMobilePanel(false)}/>}
  {((compact===false&&rightPanel)||(compact===true&&mobilePanel))&&<aside className="studio-insights" aria-label="Panneau éditorial">
    <button ref={drawerCloseRef} type="button" className="studio-insights-close" aria-label="Fermer le panneau éditorial" onClick={()=>setMobilePanel(false)}>×</button>
    <div className="insights-header"><span><AppIcon name="sparkles"/></span><strong>{t('editor.editorial')}</strong><small>{t('editor.coming')}</small></div>
    <div className="insight-card"><span className="eyebrow">{t('editor.yourWriting')}</span><h3>{t('editor.ideas')}</h3><p>{t('editor.editorialCopy')}</p></div>
    <ChapterComments bookId={bookId} chapterId={chapterId} revision={currentRevision} saveState={state} canEdit={canEdit}/>
    <div className="insight-card pale"><span className="eyebrow">{t('editor.next')}</span><p>✧ {t('editor.style')}</p><p>✧ {t('editor.suggestions')}</p><p>✧ {t('editor.bibliography')}</p></div>
    <div className="insights-footer">{t('editor.respects')}</div>
  </aside>}
 </div>;
}
