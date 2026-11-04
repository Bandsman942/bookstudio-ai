'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname,useRouter} from 'next/navigation';
import ActionMenu from './ActionMenu';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {explainActionError} from '@/lib/notification-copy';

type Props={bookId:string;chapterId:string;title:string;updatedAt:string;revision:number;editable:boolean};

export default function ChapterActionsMenu({bookId,chapterId,title,updatedAt,revision,editable}:Props){
 const {t,locale}=useAppPreferences(),{notify}=useToast();
 const [mode,setMode]=useState<'create'|'rename'|'delete'|null>(null);
 const [desired,setDesired]=useState(title),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const router=useRouter(),pathname=usePathname();
 const endpoint='/api/v1/books/'+bookId+'/chapters/'+chapterId;
 function close(){if(!busy){setMode(null);setError('');}}
 useEffect(()=>{
   if(!mode||busy)return;
   const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setMode(null);};
   document.addEventListener('keydown',key);return ()=>document.removeEventListener('keydown',key);
 },[mode,busy]);
 async function submit(event:React.FormEvent){
   event.preventDefault();if(!editable||busy||!mode)return;
   setBusy(true);setError('');
   const deleting=mode==='delete',creating=mode==='create';
   const verb=deleting?'chapter-delete':creating?'chapter-create':'chapter-rename';
   try{
     const response=await fetch(creating?'/api/v1/books/'+bookId+'/chapters':deleting?endpoint:endpoint+'/metadata',{
       method:creating?'POST':deleting?'DELETE':'PATCH',headers:{'Content-Type':'application/json'},
       body:JSON.stringify(creating?{title:desired}:deleting?{
         confirm:'DELETE',expectedRevision:revision,expectedUpdatedAt:updatedAt
       }:{title:desired,expectedUpdatedAt:updatedAt})
     });
     const payload=await response.json().catch(()=>({}));
     if(!response.ok){
       const msg=explainActionError({locale,operation:verb,status:response.status,code:payload.error});
       setError(msg);notify({tone:response.status===409?'warning':'error',
         title:locale==='fr'?(deleting?'Suppression du chapitre refusée':creating?'Création du chapitre refusée':'Renommage refusé'):
           (deleting?'Chapter removal refused':creating?'Chapter creation refused':'Rename refused'),detail:msg});return;
     }
     setMode(null);
     notify({tone:'success',
       title:locale==='fr'?(deleting?'Chapitre retiré du manuscrit':creating?'Chapitre créé':'Chapitre renommé'):
         (deleting?'Chapter removed from manuscript':creating?'Chapter created':'Chapter renamed'),
       detail:locale==='fr'?(deleting?'« '+title+' » reste conservé avec son historique et peut être restauré depuis la vue d’ensemble.':
         creating?'« '+desired+' » a été ajouté au manuscrit.':
         '« '+title+' » est désormais intitulé « '+desired+' ».'):
         (deleting?'“'+title+'” is preserved with its revision history and can be restored from the overview.':
           creating?'“'+desired+'” was added to the manuscript.':
           '“'+title+'” is now named “'+desired+'”.')});
     if(creating&&payload.chapter?.id){
       router.push('/books/'+bookId+'/chapters/'+payload.chapter.id);
     }else if(deleting&&pathname===('/books/'+bookId+'/chapters/'+chapterId)){
       router.replace('/books/'+bookId);
     }else router.refresh();
   }catch{
     const msg=explainActionError({locale,operation:verb,status:0});setError(msg);
     notify({tone:'error',title:locale==='fr'?'Action sur le chapitre interrompue':'Chapter action interrupted',detail:msg});
   }finally{setBusy(false);}
 }
 const start=(next:'create'|'rename'|'delete')=>{setDesired(next==='create'?'':title);setError('');setMode(next);};
 return <>
   <ActionMenu label={t('chapter.actionsFor',{title})} disabled={busy} actions={[
     {label:t('chapter.open'),href:endpoint.replace('/api/v1','')},
     ...(editable?[{label:t('book.chapterAdd'),separatorBefore:true,onSelect:()=>start('create')},
       {label:t('chapter.rename'),onSelect:()=>start('rename')},
       {label:locale==='fr'?'Retirer le chapitre…':'Remove chapter…',destructive:true,
         onSelect:()=>start('delete')}]:[])
   ]}/>
   {mode&&typeof document!=='undefined'&&createPortal(<div className="modal-backdrop" style={{zIndex:2200}} onMouseDown={event=>{if(event.target===event.currentTarget)close();}}>
     <form className="modal" role="dialog" aria-modal="true"
       aria-label={mode==='create'?t('book.newChapterTitle'):
         locale==='fr'?(mode==='delete'?'Retirer un chapitre':t('chapter.renameHeading')):
         (mode==='delete'?'Remove chapter':t('chapter.renameHeading'))} onSubmit={submit}>
       <button className="close" type="button" aria-label={t('common.close')} disabled={busy} onClick={close}>×</button>
       <div className="eyebrow">{t('chapter.section')}</div>
       <h2>{mode==='create'?t('book.newChapterTitle'):mode==='rename'?t('chapter.renameHeading'):
         (locale==='fr'?'Retirer ce chapitre du manuscrit ?':'Remove this chapter from the manuscript?')}</h2>
       {mode!=='delete'?<>
         <p>{mode==='create'?t('book.overviewSubtitle'):t('chapter.renameDetails')}</p>
         <label>{t('book.newTitle')}
           <input autoFocus required minLength={2} maxLength={180} value={desired}
             onChange={event=>setDesired(event.target.value)}/>
         </label>
       </>:<p>{locale==='fr'?
         '« '+title+' » disparaîtra de la navigation et de la recherche active. Son texte, ses révisions et ses commentaires seront conservés. Restauration possible depuis la vue d’ensemble.':
         '“'+title+'” will disappear from active navigation and search. Its content, revisions and comments remain preserved and can be restored from the overview.'}</p>}
       {error&&<p className="form-error" role="alert">{error}</p>}
       <button className={'button full'+(mode==='delete'?' is-danger':'')} type="submit" disabled={busy}>
         {busy?t('book.saving'):mode==='create'?t('book.chapterCreate'):mode==='delete'?
           (locale==='fr'?'Confirmer le retrait réversible':'Confirm reversible removal'):
           t('book.saveTitle')}
       </button>
       <button className="text-button" type="button" onClick={close} disabled={busy}>{t('common.cancel')}</button>
     </form>
   </div>,document.body)}
 </>;
}
