'use client';
import {useCallback,useEffect,useState} from 'react';
import ActionMenu from './ActionMenu';
import {useAppPreferences} from './AppPreferences';

type CommentView={
 id:string;body:string;quote:string|null;status:'OPEN'|'RESOLVED';
 stale:boolean;baseRevision:number;authorName:string;createdAt:string;
};
type Props={
 bookId:string;chapterId:string;revision:number;
 saveState:'saved'|'editing'|'saving'|'conflict'|'error'|'offline';
 canEdit:boolean;
};
export default function ChapterComments({bookId,chapterId,revision,saveState,canEdit}:Props){
 const {t,locale}=useAppPreferences();
 const [items,setItems]=useState<CommentView[]>([]);
 const [body,setBody]=useState(''),[loading,setLoading]=useState(false),
       [saving,setSaving]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const endpoint='/api/v1/books/'+bookId+'/chapters/'+chapterId+'/comments';

 const refresh=useCallback(async()=>{
   const response=await fetch(endpoint,{cache:'no-store'});
   if(!response.ok)throw new Error('Commentaires indisponibles');
   const payload=await response.json();
   setItems(payload.comments);
 },[endpoint]);

 useEffect(()=>{
   let active=true;
   setLoading(true);
   refresh().catch(()=>{
     if(active)setError(t('comments.loadError'));
   }).finally(()=>{if(active)setLoading(false)});
   return ()=>{active=false};
 },[refresh]);

 async function add(e:React.FormEvent){
   e.preventDefault();if(!canEdit||saveState!=='saved'||body.trim().length<2)return;
   setSaving(true);setError('');setSuccess('');
   try{
     const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({body:body.trim(),baseRevision:revision})});
     const payload=await res.json();
     if(!res.ok){
       setError(res.status===409?t('comments.conflict'):(payload.error||t('comments.createError')));
       return;
     }
     setBody('');setSuccess(t('comments.created'));
     await refresh();
   }catch{setError(t('comments.networkError'));}
   finally{setSaving(false);}
 }
 async function change(id:string,status:'OPEN'|'RESOLVED'){
   if(!canEdit)return;
   setSaving(true);setError('');setSuccess('');
   try{
     const res=await fetch(endpoint+'/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
     if(!res.ok){setError(t('comments.updateError'));return;}
     await refresh();
   }catch{setError(t('comments.retry'));}
   finally{setSaving(false);}
 }

 return <section className="editor-comments" aria-label={t('comments.title')}>
   <div className="insights-header"><span>◉</span><strong>{t('comments.title')}</strong><small>{items.length}</small></div>
   <p className="editor-comments-intro">{t('comments.intro')}</p>
   {canEdit&&<form onSubmit={add} className="editor-comments-form">
     <label htmlFor="comment-body" className="sr-only">{t('comments.new')}</label>
     <textarea id="comment-body" value={body} required minLength={2} maxLength={2000}
       onChange={e=>setBody(e.target.value)} placeholder={t('comments.placeholder')} />
     <button type="submit" className="button small" disabled={saving||saveState!=='saved'}>
       {t(saving?'comments.saving':'comments.add')}
     </button>
     {saveState!=='saved'&&<small className="comment-note">{t('comments.waitSave')}</small>}
   </form>}
   {error&&<p role="alert" className="form-error">{error}</p>}
   {success&&<p role="status" className="versions-success">{success}</p>}
   {loading?<p className="comment-note">{t('comments.loading')}</p>:
     items.length===0?<p className="comment-note">{t('comments.none')}</p>:
     <div className="comment-list">{items.map(item=><article key={item.id} className="comment-card">
       <div className="comment-card-header"><strong>{item.authorName}</strong>
         <div className="comment-card-tools">
           <small>{new Date(item.createdAt).toLocaleDateString(locale==='fr'?'fr-FR':'en-US')}</small>
           {canEdit&&<ActionMenu label={t('comments.actionsFor',{name:item.authorName})} disabled={saving}
             actions={[{label:t(item.status==='OPEN'?'comments.resolve':'comments.reopen'),
               onSelect:()=>void change(item.id,item.status==='OPEN'?'RESOLVED':'OPEN')}]}/>}
         </div>
       </div>
       <div className="comment-badges">
         <span className={item.status==='RESOLVED'?'comment-resolved':'comment-open'}>{t(item.status==='RESOLVED'?'comments.resolved':'comments.open')}</span>
         {(item.baseRevision!==revision)&&<span className="comment-stale">⚠ {t('comments.reviewRevision',{count:item.baseRevision})}</span>}
       </div>
       {item.quote&&<blockquote>{item.quote}</blockquote>}
       <p>{item.body}</p>
       
     </article>)}</div>}
 </section>;
}
