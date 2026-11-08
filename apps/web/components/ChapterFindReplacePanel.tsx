'use client';
import {useEffect,useRef,useState} from 'react';
import type {useEditor} from '@tiptap/react';
import {TextSelection} from '@tiptap/pm/state';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {
 findChapterTextMatches,applyChapterTextReplacements,
 type ChapterFindResult,FIND_MAX_MATCHES
} from '@/lib/chapter-find-replace';

type Editor=NonNullable<ReturnType<typeof useEditor>>;
type Props={editor:Editor|null;chapterTitle:string;canEdit:boolean;
 canReplaceNow:()=>boolean};
type Confirmation={doc:Editor['state']['doc'];signature:string;count:number};

/** Local, zero-network search. Replacement uses ONE prevalidated
 * ProseMirror transaction and the existing Studio autosave pipeline.
 * It does not rewrite mark boundaries, which are explicitly not searched.
 */
export default function ChapterFindReplacePanel({
 editor,chapterTitle,canEdit,canReplaceNow
}:Props){
 const {locale}=useAppPreferences(),{notify}=useToast();
 const [open,setOpen]=useState(false),[replaceMode,setReplaceMode]=useState(false);
 const [query,setQuery]=useState(''),[value,setValue]=useState('');
 const [caseSensitive,setCaseSensitive]=useState(false);
 const [scan,setScan]=useState<ChapterFindResult>({matches:[],limited:false});
 const [index,setIndex]=useState(0);
 const [version,setVersion]=useState(0);
 const [scanning,setScanning]=useState(false);
 const [confirmation,setConfirmation]=useState<Confirmation|null>(null);
 const [error,setError]=useState('');
 const inputRef=useRef<HTMLInputElement>(null);

 useEffect(()=>{
   if(!editor)return;
   const changed=()=>{setVersion(v=>v+1);setConfirmation(null);};
   editor.on('update',changed);
   return ()=>{editor.off('update',changed);};
 },[editor]);
 useEffect(()=>{
   const key=(event:KeyboardEvent)=>{
     const mod=event.ctrlKey||event.metaKey;
     if(!mod||event.altKey||event.shiftKey)return;
     const letter=event.key.toLowerCase();
     if(letter!=='f'&&letter!=='h')return;
     // Do not steal find/replace from another modal that is in progress.
     if(!open&&document.querySelector('[role="dialog"][aria-modal="true"]'))return;
     event.preventDefault();
     setOpen(true);
     if(letter==='h'&&canEdit)setReplaceMode(true);
     window.requestAnimationFrame(()=>inputRef.current?.focus());
   };
   document.addEventListener('keydown',key);
   return ()=>document.removeEventListener('keydown',key);
 },[canEdit,open]);
 useEffect(()=>{
   if(open)window.requestAnimationFrame(()=>inputRef.current?.focus());
 },[open]);
 useEffect(()=>{
   if(!open||!editor){setScanning(false);return;}
   setScanning(true);
   const timeout=setTimeout(()=>{
     try{
       const result=findChapterTextMatches(editor.state.doc,query,caseSensitive);
       setScan(result);setIndex(previous=>Math.min(previous,Math.max(0,result.matches.length-1)));
       setError('');
     }catch{
       setScan({matches:[],limited:false});
       setIndex(0);
       setError(locale==='fr'?
         'Recherche non valide : saisissez entre 1 et 120 caractères sans retour à la ligne.':
         'Invalid search: enter 1–120 characters without line breaks.');
     }finally{setScanning(false);}
   },130);
   return ()=>clearTimeout(timeout);
 },[open,editor,query,caseSensitive,version,locale]);
 useEffect(()=>{setConfirmation(null);},[query,value,caseSensitive]);

 function showMatch(nextIndex:number){
   if(!editor||!query.trim())return;
   let fresh:ChapterFindResult;
   try{fresh=findChapterTextMatches(editor.state.doc,query,caseSensitive);}
   catch{return;}
   if(fresh.matches.length===0)return;
   const normalized=(nextIndex+fresh.matches.length)%fresh.matches.length;
   const match=fresh.matches[normalized];
   // Position-based selection, without altering any manuscript characters.
   editor.view.dispatch(editor.state.tr
     .setSelection(TextSelection.create(editor.state.doc,match.from,match.to))
     .scrollIntoView());
   editor.view.focus();
   setIndex(normalized);
   setScan(fresh);
 }
 function reject(detail:string,tone:'error'|'warning'='warning'){
   setError(detail);
   notify({tone,title:locale==='fr'?'Remplacement non appliqué':'Replacement not applied',
     detail,key:'find-replace|'+detail.slice(0,40)});
 }
 function perform(all:boolean){
   if(!editor||!canEdit)return;
   if(!canReplaceNow()){
     reject(locale==='fr'?
       'Le chapitre présente un conflit ou une erreur de sauvegarde. Résolvez-la avant de modifier plusieurs passages.':
       'The chapter has a revision conflict or save error. Resolve it before replacing text.');
     return;
   }
   let fresh:ChapterFindResult;
   try{fresh=findChapterTextMatches(editor.state.doc,query,caseSensitive);}
   catch{
     reject(locale==='fr'?'Votre recherche contient des caractères invalides.':
       'Your search contains invalid characters.');return;
   }
   if(!fresh.matches.length){reject(locale==='fr'?
     'Aucune correspondance exacte dans ce chapitre.':'No exact matches in this chapter.');return;}
   if(all&&fresh.limited){
     reject(locale==='fr'?
       'Plus de 500 résultats. Précisez votre recherche : aucun remplacement partiel ne sera effectué.':
       'Over 500 matches. Narrow your search: partial replace-all is not allowed.');
     return;
   }
   const signature=JSON.stringify({query,value,caseSensitive,all});
   if(all){
     if(!confirmation){
       setConfirmation({doc:editor.state.doc,signature,count:fresh.matches.length});
       setError('');
       return;
     }
     if(confirmation.doc!==editor.state.doc||
        confirmation.signature!==signature||
        confirmation.count!==fresh.matches.length){
       setConfirmation(null);
       reject(locale==='fr'?
         'Le texte ou les options ont changé depuis la prévisualisation. Relancez la confirmation.':
         'The text or options changed since preview. Review and confirm again.');
       return;
     }
   }
   // A single replacement uses the exact position shown by the latest
   // search; a stale result must be navigated to again instead of replacing
   // a different occurrence after typing.
   const selected=scan.matches[index];
   if(!all&&(!selected||scanning||
      !fresh.matches.some(hit=>hit.from===selected.from&&hit.to===selected.to))){
     reject(locale==='fr'?
       'Le texte a changé. Actualisez la recherche avant de remplacer ce passage.':
       'The text changed. Refresh search before replacing this occurrence.');
     return;
   }
   const targets=all?fresh.matches:[selected];
   try{
     const candidate=applyChapterTextReplacements(editor.state.tr,targets,value);
     if(!candidate.docChanged)return;
     // Only now do we mutate the live editor: one atomic Undo event,
     // triggering the existing draft checkpoint + autosave.
     editor.view.dispatch(candidate.scrollIntoView());
     setConfirmation(null);setError('');
     notify({tone:'success',
       title:all?(locale==='fr'?'Remplacements appliqués':'Replacements applied'):
         (locale==='fr'?'Passage remplacé':'Occurrence replaced'),
       detail:locale==='fr'?
         (all?String(targets.length)+' passages':'Un passage')+
           ' modifié(s) dans « '+chapterTitle+' ». Sauvegarde automatique en cours ; vérifiez ensuite l’indicateur « Enregistré ».':
         (all?String(targets.length)+' occurrences':'One occurrence')+
           ' updated in “'+chapterTitle+'”. Autosave is underway; confirm the “Saved” indicator afterwards.'});
     setIndex(0);
   }catch(reason){
     const code=reason instanceof Error?reason.message:'';
     reject(code==='REPLACE_TOO_LARGE'?
       (locale==='fr'?
         'Le résultat dépasserait la taille ou la complexité autorisée du chapitre. Rien n’a été modifié.':
         'The result exceeds chapter size or complexity limits. Nothing was changed.'):
       code==='REPLACE_VALUE_INVALID'?
       (locale==='fr'?'Le texte de remplacement doit tenir en 1 000 caractères et une seule ligne.':
         'Replacement must be one line and at most 1,000 characters.'):
       (locale==='fr'?'Document incompatible ou sélection dépassée. Rien n’a été modifié.':
         'The document is unsupported or the selection is stale. Nothing was changed.'),'error');
     setConfirmation(null);
   }
 }
 const count=scan.matches.length;
 const over=scan.limited;
 // Errors describing a previous attempt must not permanently disable
 // retries after connectivity or autosave state has recovered.
 const valid=!!query.trim()&&!scanning&&query.length<=120&&
   !/[\u0000-\u001f\u007f]/.test(query);
 return <div className="chapter-find-wrap">
   <button type="button" className="studio-shortcuts-trigger chapter-find-trigger"
     title={locale==='fr'?'Rechercher / remplacer (Ctrl+F / Ctrl+H)':
       'Find / replace (Ctrl+F / Ctrl+H)'}
     aria-label={locale==='fr'?'Rechercher ou remplacer dans le chapitre':
       'Find or replace in this chapter'}
     aria-expanded={open} onClick={()=>{
       setOpen(v=>!v);setConfirmation(null);
     }}>⌕</button>
   {open&&<section className="chapter-find-panel" role="region"
     aria-label={locale==='fr'?'Recherche dans le chapitre':'Find in chapter'}>
     <div className="chapter-find-heading">
       <strong>{locale==='fr'?'Rechercher dans le chapitre':'Find in chapter'}</strong>
       <button type="button" className="text-button" onClick={()=>{
         setOpen(false);setConfirmation(null);setError('');
       }} aria-label={locale==='fr'?'Fermer la recherche':'Close find panel'}>×</button>
     </div>
     <div className="chapter-find-row">
       <label>{locale==='fr'?'Rechercher':'Find'}
         <input ref={inputRef} type="search" value={query} maxLength={120}
           onChange={event=>{setQuery(event.target.value);setIndex(0);setConfirmation(null);}}
           placeholder={locale==='fr'?'Texte exact…':'Exact text…'}
           onKeyDown={event=>{
             if(event.key==='Enter'){
               event.preventDefault();
               showMatch(index+(event.shiftKey?-1:1));
             }
           }}/>
       </label>
       <label className="chapter-find-case">
         <input type="checkbox" checked={caseSensitive} onChange={event=>{
           setCaseSensitive(event.target.checked);setIndex(0);setConfirmation(null);
         }}/>
         {locale==='fr'?'Respecter la casse':'Match case'}
       </label>
     </div>
     <div className="chapter-find-nav" aria-live="polite" aria-busy={scanning}>
       <span>{!query.trim()?(locale==='fr'?'Saisir un texte':'Enter text'):
         scanning?(locale==='fr'?'Recherche…':'Searching…'):
         over?(locale==='fr'?'Plus de 500 résultats (liste limitée)':
           'Over 500 results (list limited)'):
         count?(index+1)+' / '+count:
           (locale==='fr'?'Aucun résultat':'No matches')}</span>
       <button className="button small secondary" type="button"
         disabled={!count||scanning} onClick={()=>showMatch(index-1)}>
         {locale==='fr'?'Précédent':'Previous'}</button>
       <button className="button small secondary" type="button"
         disabled={!count||scanning} onClick={()=>showMatch(index+1)}>
         {locale==='fr'?'Suivant':'Next'}</button>
       {canEdit&&<button className="text-button" type="button"
         aria-expanded={replaceMode} onClick={()=>setReplaceMode(v=>!v)}>
         {replaceMode?(locale==='fr'?'Masquer remplacer':'Hide replace'):
           (locale==='fr'?'Remplacer…':'Replace…')}</button>}
     </div>
     {replaceMode&&canEdit&&<div className="chapter-find-replace">
       <label>{locale==='fr'?'Remplacer par':'Replace with'}
         <input type="text" value={value} maxLength={1000}
           placeholder={locale==='fr'?'Vide = supprimer le terme':'Empty = delete match'}
           onChange={event=>{setValue(event.target.value);setConfirmation(null);}}/>
       </label>
       <div className="chapter-find-actions">
         <button className="button small" type="button"
           disabled={!valid||count===0} onClick={()=>perform(false)}>
           {locale==='fr'?'Remplacer cette occurrence':'Replace this match'}</button>
         {!confirmation?<button className="button small secondary" type="button"
           disabled={!valid||count===0||over} onClick={()=>perform(true)}>
           {locale==='fr'?'Prévisualiser tout remplacer':'Review replace all'}</button>:
           <button type="button" className="button small is-danger"
             onClick={()=>perform(true)}>
             {locale==='fr'?'Confirmer '+confirmation.count+' remplacements':
               'Confirm '+confirmation.count+' replacements'}</button>}
         {confirmation&&<button type="button" className="text-button"
           onClick={()=>setConfirmation(null)}>{locale==='fr'?'Annuler':'Cancel'}</button>}
       </div>
     </div>}
     <p className="source-note chapter-find-note">{locale==='fr'?
       'Recherche locale, sans IA ni réseau. Seuls les termes inclus dans un même segment de texte sont remplaçables : les styles, liens et blocs adjacents sont protégés. Une opération « tout remplacer » est atomique, annulable en une étape, limitée à 500 occurrences. La sauvegarde suit le mécanisme habituel.':
       'Local search, no AI or network. Only matches within one text segment can be replaced, protecting adjacent styles, links and blocks. Replace all is atomic, one-step undoable and limited to 500 matches. Existing autosave applies.'}</p>
     {error&&<p role="alert" className="form-error">{error}</p>}
   </section>}
 </div>;
}
