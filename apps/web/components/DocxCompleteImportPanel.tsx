'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import AppIcon from './AppIcon';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {explainActionError} from '@/lib/notification-copy';
import {planCompleteDocxImport,type ImportPlan,DocxPlanError} from '@/lib/docx-full-plan';
import type {DocxPreview} from '@/lib/docx-preview';

type Mode='one'|'sections';
const LIST_PAGE=12;
const labels={
 fr:{
  title:'Créer des chapitres depuis tout le manuscrit',intro:'Tous les paragraphes lisibles sont analysés, même au-delà de 200 paragraphes. La liste ci-dessous représente tout le document.',
  one:'Un manuscrit en continu',sections:'Découper par titres',introTitle:'Introduction',
  singleTitle:'Titre du chapitre',label:'Titre du chapitre',total:'{blocks} blocs de texte · {chars} caractères',
  partCount:'{count} chapitres proposés',batchCount:'{count} lots sécurisés',chapterPage:'Chapitres {from} à {to} sur {total}',
  pagePrevious:'Précédent',pageNext:'Suivant',
  continuation:'{count} chapitres « suite » nécessaires pour respecter les limites de transaction. Aucun bloc n’est omis.',
  noHeadings:'Aucun ensemble de titres suffisant détecté : le manuscrit sera traité en continu.',
  fallback:'Les titres 1 ne suffisent pas : tous les autres titres sont proposés comme séparateurs. Revoyez cette détection.',
  review:'J’ai vérifié la structure proposée, les omissions signalées (images, tableaux, notes, révisions) et j’autorise la création des chapitres.',
  safety:'Les lots sont créés successivement et chaque lot est atomique. Si le réseau tombe, les lots précédents restent enregistrés et « Reprendre » poursuit sans doublon tant que ce dialogue reste ouvert.',
  preview:'Fichiers originaux inchangés. Les limites de sécurité du format DOCX (archive, mémoire) restent applicables.',
  button:'Créer tous les chapitres approuvés',retry:'Reprendre l’importation',
  progress:'Lots terminés : {done} / {total}. Chapitres créés : {chapters}.',
  sending:'Enregistrement du lot {batch} / {total}…',
  finish:'Tous les lots ont été créés. Ouverture du premier chapitre…',
  invalid:'La structure ne peut pas être importée intégralement et sûrement dans ce mode.',
  failed:'Lot non confirmé. Réessayez pour reprendre avec les mêmes identifiants (pas de doublons).',
  conflict:'Un lot a été modifié ou entre en conflit avec une opération précédente.',
  forbidden:'Accès interdit ou fichier source privé indisponible.',
  scanBlocked:'Analyse antivirus obligatoire : cette source n’est pas encore vérifiée.',
  exitNote:'Fermer le dialogue après une création partielle ne supprime pas les chapitres déjà créés.'
 },
 en:{
  title:'Create chapters from the entire manuscript',intro:'All readable paragraphs are analyzed, including beyond 200 paragraphs. The list below covers the whole document.',
  one:'Single flowing manuscript',sections:'Split by headings',introTitle:'Introduction',
  singleTitle:'Chapter title',label:'Chapter title',total:'{blocks} text blocks · {chars} characters',
  partCount:'{count} proposed chapters',batchCount:'{count} secure batches',chapterPage:'Chapters {from} to {to} of {total}',
  pagePrevious:'Previous',pageNext:'Next',
  continuation:'{count} continuation chapters required by transaction budgets. No text block is omitted.',
  noHeadings:'Not enough distinct headings: the entire manuscript is treated as one section.',
  fallback:'Heading 1 styles are insufficient: other headings are suggested as boundaries. Review carefully.',
  review:'I reviewed the proposed structure, disclosed omissions (images, tables, notes, revisions) and approve creating these chapters.',
  safety:'Batches are created sequentially; each batch is atomic. On network failure, previous batches remain and Retry continues without duplicates while this dialog remains open.',
  preview:'Original files are unchanged. DOCX archive and memory safety limits still apply.',
  button:'Create all approved chapters',retry:'Resume import',
  progress:'Completed batches: {done} / {total}. Created chapters: {chapters}.',
  sending:'Saving batch {batch} / {total}…',
  finish:'All batches saved. Opening the first chapter…',
  invalid:'The structure cannot be imported completely and safely in this mode.',
  failed:'Batch not confirmed. Retry with the same IDs to avoid duplicate chapters.',
  conflict:'The batch changed or conflicts with a prior operation.',
  forbidden:'Access denied or the private source file is unavailable.',
  scanBlocked:'Antivirus clearance required: this source is not yet verified.',
  exitNote:'Closing the dialog after partial completion does not remove chapters already created.'
 }
} as const;
function fmt(template:string,vars:Record<string,string|number>){
 return template.replace(/\{(\w+)\}/g,(_,key:string)=>String(vars[key]??''));
}
export default function DocxCompleteImportPanel({bookId,name,preview,onBusyChange}:{
 bookId:string;name:string;preview:DocxPreview;onBusyChange?:(busy:boolean)=>void
}){
 const {locale}=useAppPreferences(),t=labels[locale],router=useRouter();
 const {notify}=useToast();
 const [mode,setMode]=useState<Mode>('sections');
 const [singleTitle,setSingleTitle]=useState(name.slice(37).replace(/\.docx$/i,'').replace(/[-_]+/g,' ').slice(0,180)||'Manuscrit');
 const [titles,setTitles]=useState<string[]>([]);
 const [approved,setApproved]=useState(false),[busy,setBusy]=useState(false),
   [locked,setLocked]=useState(false),[error,setError]=useState(''),[page,setPage]=useState(0);
 const [done,setDone]=useState(0),[chapterCount,setChapterCount]=useState(0),[completed,setCompleted]=useState(false);
 const ids=useRef<string[]>([]),cursor=useRef(0),firstChapterId=useRef<string|null>(null);
 const proposed=useMemo(()=>{
   try{return {plan:planCompleteDocxImport(preview,mode,singleTitle,t.introTitle),error:''};}
   catch(e){return {plan:null,error:e instanceof DocxPlanError?e.code:'DOCX_STRUCTURE_UNAVAILABLE'};}
 },[preview,mode,singleTitle,t.introTitle]);
 const plan:ImportPlan|null=proposed.plan;
 useEffect(()=>{
   if(plan){
     setTitles(plan.parts.map(x=>x.title));setApproved(false);setPage(0);
     ids.current=[];cursor.current=0;firstChapterId.current=null;
     setDone(0);setChapterCount(0);setError('');setLocked(false);setCompleted(false);
   }
 },[plan]);
 const count=plan?.parts.length??0;
 const maxPage=Math.max(0,Math.ceil(count/LIST_PAGE)-1);
 const visible=plan?.parts.slice(page*LIST_PAGE,(page+1)*LIST_PAGE)??[];
 async function create(event:React.FormEvent){
   event.preventDefault();
   if(!plan||busy||completed||!approved||titles.length!==count||titles.some(x=>x.trim().length<2))return;
   setBusy(true);setLocked(true);setError('');onBusyChange?.(true);
   if(ids.current.length!==plan.batches.length)ids.current=plan.batches.map(()=>crypto.randomUUID());
   let offset=0;
   const startByBatch=plan.batches.map(batch=>{const start=offset;offset+=batch.parts.length;return start;});
   try{
     for(let index=cursor.current;index<plan.batches.length;index++){
       const batch=plan.batches[index];
       const chapters=batch.parts.map((part,partIndex)=>({
         title:titles[startByBatch[index]+partIndex],
         blocks:part.blocks.map(({kind,text})=>({kind,text}))
       }));
       const single=chapters.length===1;
       const endpoint='/api/v1/books/'+bookId+'/import/docx'+(single?'':'/bulk');
       const payload=single?{
         sourceName:name,operationId:ids.current[index],title:chapters[0].title,
         blocks:chapters[0].blocks,confirm:'IMPORT_REVIEWED_DOCX',acknowledged:true,truncated:false
       }:{
         sourceName:name,batchId:ids.current[index],chapters,
         confirm:'IMPORT_REVIEWED_DOCX_BATCH',acknowledged:true,truncated:false
       };
       const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
         body:JSON.stringify(payload)});
       const data=await response.json().catch(()=>({})) as {chapter?:{id:string};chapters?:{id:string}[];error?:string};
       const saved=single?(data.chapter?[data.chapter]:[]):data.chapters??[];
       if(!response.ok||saved.length!==chapters.length||!saved[0]?.id){
         const msg=explainActionError({locale,operation:'docx-import',status:response.status,code:data.error});
         setError(msg);
         notify({tone:response.status===409?'warning':'error',title:locale==='fr'?
           'Importation du lot '+(index+1)+'/'+plan.batches.length+' interrompue':
           'Import batch '+(index+1)+'/'+plan.batches.length+' interrupted',
           detail:msg+' '+fmt(t.progress,{done:cursor.current,chapters:startByBatch[index],total:plan.batches.length})});
         return;
       }
       if(!firstChapterId.current)firstChapterId.current=saved[0].id;
       cursor.current=index+1;
       setDone(cursor.current);
       setChapterCount(startByBatch[index]+saved.length);
     }
     setCompleted(true);
     notify({tone:'success',title:locale==='fr'?'Manuscrit converti en chapitres':'Manuscript converted into chapters',
       detail:locale==='fr'?count+' chapitres créés à partir de « '+name.slice(37)+' » en '+plan.batches.length+' lot(s). Le DOCX original reste conservé.':
         count+' chapters created from “'+name.slice(37)+'” in '+plan.batches.length+' batch(es). The source DOCX is kept.'});
     if(firstChapterId.current){
       router.push('/books/'+bookId+'/chapters/'+firstChapterId.current);
       router.refresh();
     }
   }catch{const msg=explainActionError({locale,operation:'docx-import',status:0});setError(msg);
     notify({tone:'error',title:locale==='fr'?'Connexion perdue pendant la conversion':'Connection lost during import',
       detail:msg+' '+fmt(t.progress,{done:cursor.current,chapters:chapterCount,total:plan.batches.length})});}
   finally{setBusy(false);onBusyChange?.(false);}
 }
 return <section className="docx-complete-import" aria-labelledby="docx-complete-title">
   <h3 id="docx-complete-title"><AppIcon name="chapter" size={20}/>{t.title}</h3>
   <p className="source-note">{t.intro}</p>
   <p className="source-note">{fmt(t.total,{blocks:preview.blocks.length,
      chars:preview.blocks.reduce((n,b)=>n+b.text.length,0)})}</p>
   <div className="docx-import-modes" role="group" aria-label={t.title}>
     <button type="button" className={mode==='sections'?'is-selected':''}
       onClick={()=>setMode('sections')} disabled={locked||busy}>{t.sections}</button>
     <button type="button" className={mode==='one'?'is-selected':''}
       onClick={()=>setMode('one')} disabled={locked||busy}>{t.one}</button>
   </div>
   {mode==='one'&&<label className="docx-full-label" htmlFor="docx-whole-title">{t.singleTitle}
     <input id="docx-whole-title" type="text" value={singleTitle} minLength={2} maxLength={180}
       disabled={locked||busy} onChange={e=>setSingleTitle(e.target.value)}/>
   </label>}
   {proposed.error&&<p className="form-error" role="alert">{t.invalid} ({proposed.error})</p>}
   {plan&&<form className="docx-import-form" onSubmit={e=>void create(e)}>
     {!plan.hasHeadings&&mode==='sections'&&<p className="source-note">{t.noHeadings}</p>}
     {plan.fallback&&<p className="source-note">{t.fallback}</p>}
     <div className="docx-import-summary">
       <span>{fmt(t.partCount,{count:count})}</span>
       <span>{fmt(t.batchCount,{count:plan.batches.length})}</span>
     </div>
     {plan.continuations>0&&<p className="source-note">{fmt(t.continuation,{count:plan.continuations})}</p>}
     <p className="source-note">{fmt(t.chapterPage,{from:page*LIST_PAGE+1,
       to:Math.min(count,(page+1)*LIST_PAGE),total:count})}</p>
     <ol className="docx-split-chapters" start={page*LIST_PAGE+1}>
       {visible.map((part,index)=>{
         const absolute=page*LIST_PAGE+index;
         return <li key={absolute}>
           <label htmlFor={'docx-plan-title-'+absolute}>{t.label} {absolute+1}
             <input id={'docx-plan-title-'+absolute} type="text" minLength={2} maxLength={180}
               value={titles[absolute]??part.title} disabled={locked||busy}
               onChange={e=>setTitles(items=>items.map((s,i)=>i===absolute?e.target.value:s))} required/>
           </label>
           <small>{fmt(t.total,{blocks:part.blocks.length,
             chars:part.blocks.reduce((n,b)=>n+b.text.length,0)})}</small>
           <p className="docx-chapter-excerpt">{part.blocks[0]?.text}</p>
         </li>;
       })}
     </ol>
     {maxPage>0&&<div className="docx-page-actions">
       <button type="button" className="text-button" disabled={page<=0||busy}
         onClick={()=>setPage(p=>Math.max(0,p-1))}>{t.pagePrevious}</button>
       <span>{page+1} / {maxPage+1}</span>
       <button type="button" className="text-button" disabled={page>=maxPage||busy}
         onClick={()=>setPage(p=>Math.min(maxPage,p+1))}>{t.pageNext}</button>
     </div>}
     <p className="source-note">{t.safety} {t.preview}</p>
     <label className="docx-acknowledge"><input type="checkbox" required
       checked={approved} disabled={busy} onChange={e=>setApproved(e.target.checked)}/>
       <span>{t.review}</span></label>
     <p className="docx-import-progress" role="status" aria-live="polite">
       {fmt(t.progress,{done,chapters:chapterCount,total:plan.batches.length})}
       {busy&&' '+fmt(t.sending,{batch:cursor.current+1,total:plan.batches.length})}
     </p>
     {error&&<p className="form-error" role="alert">{error}</p>}
     {completed?<p className="source-success" role="status">{t.finish}</p>:
       <button className="button full" type="submit"
         disabled={busy||!approved||titles.some(x=>x.trim().length<2)}>
         <AppIcon name="upload"/>{busy?fmt(t.sending,{batch:cursor.current+1,total:plan.batches.length}):
           done>0?t.retry:t.button}
       </button>}
     {done>0&&!completed&&<p className="source-note">{t.exitNote}</p>}
   </form>}
 </section>;
}
