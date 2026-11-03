'use client';
import {useEffect,useRef,useState} from 'react';
import {EditorContent,useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from 'next/link';
type Chapter={id:string;title:string};
type SaveState='saved'|'editing'|'saving'|'conflict'|'error';
type Props={bookId:string;bookTitle:string;chapterId:string;chapterTitle:string;revision:number;initialContent:Record<string,unknown>;chapters:Chapter[]};
export default function StudioEditor({bookId,bookTitle,chapterId,chapterTitle,revision,initialContent,chapters}:Props){
 const [state,setState]=useState<SaveState>('saved');
 const [currentRevision,setRevision]=useState(revision);
 const [focus,setFocus]=useState(false),[rightPanel,setRightPanel]=useState(true),[wordCount,setWordCount]=useState(0),[errorDetail,setErrorDetail]=useState('');
 const [recovery,setRecovery]=useState<string|null>(null);
 const revisionRef=useRef(revision),savedContentRef=useRef(JSON.stringify(initialContent)),pendingRef=useRef(false),savingRef=useRef(false),lastJson=useRef(JSON.stringify(initialContent));
 const draftKey='bookstudio:draft:'+chapterId;
 const editor=useEditor({
   extensions:[StarterKit],
   content:initialContent as any,
   immediatelyRender:false,
   onUpdate:({editor})=>{
     lastJson.current=JSON.stringify(editor.getJSON());
     setWordCount(editor.getText().trim().split(/\s+/).filter(Boolean).length);
     pendingRef.current=true;setState('editing');
     try{localStorage.setItem(draftKey,lastJson.current);}catch{}
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
   const id=setInterval(async()=>{
     if(!pendingRef.current||savingRef.current||state==='conflict')return;
     if(lastJson.current===savedContentRef.current){pendingRef.current=false;setState('saved');return;}
     const snapshot=lastJson.current,baseRevision=revisionRef.current;
     pendingRef.current=false;savingRef.current=true;setState('saving');
     try{
       const res=await fetch('/api/v1/books/'+bookId+'/chapters/'+chapterId,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({baseRevision,content:JSON.parse(snapshot)})});
       const body=await res.json();
       if(res.status===409){
         setState('conflict');setErrorDetail('Conflit de versions. Votre texte reste visible dans cet onglet et dans le brouillon local. Copiez-le avant de recharger.');
         return;
       }
       if(!res.ok){pendingRef.current=true;setState('error');setErrorDetail('Échec de sauvegarde, nouvelle tentative automatique.');return;}
       revisionRef.current=body.revision;setRevision(body.revision);
       savedContentRef.current=snapshot;
       if(lastJson.current!==snapshot){pendingRef.current=true;setState('editing');}
       else{setState('saved');try{localStorage.removeItem(draftKey);}catch{}}
     }catch{pendingRef.current=true;setState('error');setErrorDetail('Connexion interrompue. Votre brouillon reste conservé localement.');}
     finally{savingRef.current=false;}
   },1400);return()=>clearInterval(id);
 },[bookId,chapterId,state,draftKey]);
 useEffect(()=>{
   const handler=(e:BeforeUnloadEvent)=>{if(pendingRef.current||savingRef.current){e.preventDefault();e.returnValue='';}};
   window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);
 },[]);
 const format=(command:'bold'|'italic'|'h1'|'h2'|'bullet')=>{
   if(!editor)return;
   if(command==='bold')editor.chain().focus().toggleBold().run();
   if(command==='italic')editor.chain().focus().toggleItalic().run();
   if(command==='h1')editor.chain().focus().toggleHeading({level:1}).run();
   if(command==='h2')editor.chain().focus().toggleHeading({level:2}).run();
   if(command==='bullet')editor.chain().focus().toggleBulletList().run();
 };
 return <div className={'studio '+(focus?'studio-focus':'')}>
  <aside className="studio-sidebar">
    <Link href="/library" className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
    <Link href={'/books/'+bookId} className="back-link">← Vue d'ensemble</Link>
    <div className="nav-section">MANUSCRIT</div><div className="studio-book-title">{bookTitle}</div>
    <div className="chapter-navigation">{chapters.map((c,i)=><Link href={'/books/'+bookId+'/chapters/'+c.id} key={c.id} className={'chapter-nav-link '+(c.id===chapterId?'selected':'')}>{String(i+1).padStart(2,'0')} <span>{c.title}</span></Link>)}</div>
    <div className="nav-spacer"/><div className="sidebar-footer">Un livre, une idée à la fois. ✦</div>
  </aside>
  <main className="studio-center">
    <div className="studio-topbar"><span className="breadcrumb"><Link href={'/books/'+bookId}>{bookTitle}</Link> / <strong>{chapterTitle}</strong></span>
      <div className="studio-actions"><span className={'save-state save-'+state}>{state==='saved'?'✓ Enregistré':state==='editing'?'● Modifié':state==='saving'?'◌ Enregistrement…':state==='conflict'?'⚠ Conflit de versions':'⚠ Sauvegarde en attente'}</span>
      <button title="Mode concentration" onClick={()=>setFocus(!focus)} className="icon-button">{focus?'◱':'⛶'}</button><button title="Afficher les conseils" onClick={()=>setRightPanel(!rightPanel)} className="icon-button">◧</button></div>
    </div>
    <div className="toolbar"><button onClick={()=>format('h1')}>Titre 1</button><button onClick={()=>format('h2')}>Titre 2</button><i/><button onClick={()=>format('bold')}><b>G</b></button><button onClick={()=>format('italic')}><em>I</em></button><button onClick={()=>format('bullet')}>☷ Liste</button><i/><button onClick={()=>editor?.chain().focus().undo().run()} title="Annuler">↶</button><button onClick={()=>editor?.chain().focus().redo().run()} title="Rétablir">↷</button></div>
    {recovery&&<div role="alert" className="editor-warning">Un brouillon local plus récent a été trouvé.
      <button onClick={()=>{try{editor?.commands.setContent(JSON.parse(recovery) as any);setRecovery(null);}catch{setErrorDetail('Brouillon local illisible.');}}}>Restaurer mon brouillon</button>
      <button onClick={()=>{setRecovery(null);try{localStorage.removeItem(draftKey)}catch{}}}>Ignorer</button>
    </div>}
    {(state==='conflict'||state==='error')&&<div className="editor-warning" role="alert">{errorDetail}</div>}
    <div className="editor-scroll"><article className="editor-sheet"><span className="chapter-label">MANUSCRIT · CHAPITRE</span><h1>{chapterTitle}</h1><div className="editor-rule"/><EditorContent editor={editor} className="prose-editor"/></article></div>
    <div className="editor-status"><span>{wordCount.toLocaleString('fr-FR')} mots</span><span>Révision {currentRevision}</span><span>Sauvegarde automatique</span></div>
  </main>
  {rightPanel&&<aside className="studio-insights"><div className="insights-header"><span>✦</span><strong>Intelligence éditoriale</strong><small>À venir</small></div>
    <div className="insight-card"><span className="eyebrow">VOTRE ÉCRITURE</span><h3>Un espace pour vos idées.</h3><p>Votre manuscrit dispose d'un historique de révisions. L'IA ne modifiera jamais votre texte sans accord.</p></div>
    <div className="insight-card pale"><span className="eyebrow">AU PROGRAMME</span><p>✧ Analyse stylistique</p><p>✧ Suggestions à valider</p><p>✧ Bibliographie intelligente</p></div>
    <div className="insights-footer">BookStudio AI respecte votre voix.</div>
  </aside>}
 </div>;
}
