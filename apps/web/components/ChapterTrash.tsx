'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {explainActionError} from '@/lib/notification-copy';

type Removed={id:string;title:string;updatedAt:string;deletedAt:string};
export default function ChapterTrash({bookId}:{bookId:string}){
 const {locale}=useAppPreferences(),{notify}=useToast(),router=useRouter();
 const [chapters,setChapters]=useState<Removed[]>([]),[busy,setBusy]=useState<string|null>(null);
 const [open,setOpen]=useState(false),[error,setError]=useState('');
 async function load(){
   try{
     const response=await fetch('/api/v1/books/'+bookId+'/chapters/trash',{cache:'no-store'});
     if(!response.ok)throw Error();
     const data=await response.json() as {chapters:Removed[]};
     setChapters(data.chapters??[]);setError('');
   }catch{setError(locale==='fr'?'Liste des chapitres retirés indisponible.':'Removed chapters unavailable.');}
 }
 useEffect(()=>{void load();},[bookId]);
 async function restore(chapter:Removed){
   if(busy)return;
   if(!window.confirm(locale==='fr'?'Restaurer « '+chapter.title+' » dans ce manuscrit ?':
       'Restore “'+chapter.title+'” to this manuscript?'))return;
   setBusy(chapter.id);setError('');
   try{
     const response=await fetch('/api/v1/books/'+bookId+'/chapters/'+chapter.id+'/restore',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({confirm:'RESTORE_CHAPTER',expectedUpdatedAt:chapter.updatedAt})
     });
     const data=await response.json().catch(()=>({})) as {error?:string};
     if(!response.ok)throw Error(data.error+'|'+response.status);
     await load();router.refresh();
     notify({tone:'success',title:locale==='fr'?'Chapitre restauré':'Chapter restored',
       detail:locale==='fr'?'« '+chapter.title+' » retrouve sa place dans le manuscrit avec son historique.':
         '“'+chapter.title+'” is back in the manuscript with its history.'});
   }catch(e){
     const code=e instanceof Error?e.message.split('|')[0]:'';
     const status=e instanceof Error?Number(e.message.split('|')[1])||0:0;
     const msg=explainActionError({locale,operation:'chapter-restore',code,status});
     setError(msg);notify({tone:'error',title:locale==='fr'?'Restauration du chapitre impossible':'Chapter restore failed',detail:msg});
   }finally{setBusy(null);}
 }
 return <section className="chapter-trash" aria-label={locale==='fr'?'Chapitres retirés':'Removed chapters'}>
   <button type="button" className="text-button chapter-trash-toggle" aria-expanded={open}
     onClick={()=>{setOpen(!open);if(!open)void load();}}>
     {locale==='fr'?'Chapitres retirés':'Removed chapters'} ({chapters.length}) {open?'▴':'▾'}
   </button>
   {open&&<div className="chapter-trash-list">
     <p className="source-note">{locale==='fr'?
       'Ces chapitres sont masqués, mais leur texte et leurs révisions sont conservés.':
       'Removed chapters are hidden, but their content and revisions are preserved.'}</p>
     {error&&<p role="alert" className="form-error">{error}</p>}
     {chapters.length===0?<p className="source-note">{locale==='fr'?'Aucun chapitre retiré.':'No removed chapters.'}</p>:
       chapters.map(c=><div className="chapter-trash-row" key={c.id}>
         <span>{c.title}</span>
         <button type="button" className="text-button" disabled={!!busy}
           onClick={()=>void restore(c)}>{locale==='fr'?'Restaurer':'Restore'}</button>
       </div>)}
   </div>}
 </section>;
}
