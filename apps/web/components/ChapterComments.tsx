'use client';
import {useCallback,useEffect,useState} from 'react';
import ActionMenu from './ActionMenu';

type CommentView={
 id:string;body:string;quote:string|null;status:'OPEN'|'RESOLVED';
 stale:boolean;baseRevision:number;authorName:string;createdAt:string;
};
type Props={
 bookId:string;chapterId:string;revision:number;
 saveState:'saved'|'editing'|'saving'|'conflict'|'error';
 canEdit:boolean;
};
export default function ChapterComments({bookId,chapterId,revision,saveState,canEdit}:Props){
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
     if(active)setError('Impossible de charger les commentaires.');
   }).finally(()=>{if(active)setLoading(false)});
   return ()=>{active=false};
 },[refresh,revision]);

 async function add(e:React.FormEvent){
   e.preventDefault();if(!canEdit||saveState!=='saved'||body.trim().length<2)return;
   setSaving(true);setError('');setSuccess('');
   try{
     const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({body:body.trim(),baseRevision:revision})});
     const payload=await res.json();
     if(!res.ok){
       setError(res.status===409?'Le chapitre a changé. Rechargez les commentaires avant d’ajouter cette note.':(payload.error||'Création impossible.'));
       return;
     }
     setBody('');setSuccess('Commentaire enregistré.');
     await refresh();
   }catch{setError('Connexion interrompue. Aucun commentaire confirmé.');}
   finally{setSaving(false);}
 }
 async function change(id:string,status:'OPEN'|'RESOLVED'){
   if(!canEdit)return;
   setSaving(true);setError('');setSuccess('');
   try{
     const res=await fetch(endpoint+'/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
     if(!res.ok){setError('Impossible de modifier le statut du commentaire.');return;}
     await refresh();
   }catch{setError('Connexion interrompue. Réessayez.');}
   finally{setSaving(false);}
 }

 return <section className="editor-comments" aria-label="Commentaires éditoriaux">
   <div className="insights-header"><span>◉</span><strong>Commentaires</strong><small>{items.length}</small></div>
   <p className="editor-comments-intro">Les commentaires restent associés à leur révision d’origine. Les notes à revoir ne sont jamais réancrées automatiquement.</p>
   {canEdit&&<form onSubmit={add} className="editor-comments-form">
     <label htmlFor="comment-body" className="sr-only">Nouveau commentaire</label>
     <textarea id="comment-body" value={body} required minLength={2} maxLength={2000}
       onChange={e=>setBody(e.target.value)} placeholder="Noter une idée, une correction ou une remarque…" />
     <button type="submit" className="button small" disabled={saving||saveState!=='saved'}>
       {saving?'Enregistrement…':'Ajouter une note'}
     </button>
     {saveState!=='saved'&&<small className="comment-note">Enregistrez le chapitre avant d’ajouter un commentaire.</small>}
   </form>}
   {error&&<p role="alert" className="form-error">{error}</p>}
   {success&&<p role="status" className="versions-success">{success}</p>}
   {loading?<p className="comment-note">Chargement des commentaires…</p>:
     items.length===0?<p className="comment-note">Aucun commentaire pour ce chapitre.</p>:
     <div className="comment-list">{items.map(item=><article key={item.id} className="comment-card">
       <div className="comment-card-header"><strong>{item.authorName}</strong>
         <div className="comment-card-tools">
           <small>{new Date(item.createdAt).toLocaleDateString('fr-FR')}</small>
           {canEdit&&<ActionMenu label={'Actions pour le commentaire de '+item.authorName} disabled={saving}
             actions={[{label:item.status==='OPEN'?'Marquer comme résolu':'Rouvrir le commentaire',
               onSelect:()=>void change(item.id,item.status==='OPEN'?'RESOLVED':'OPEN')}]}/>}
         </div>
       </div>
       <div className="comment-badges">
         <span className={item.status==='RESOLVED'?'comment-resolved':'comment-open'}>{item.status==='RESOLVED'?'Résolu':'Ouvert'}</span>
         {item.stale&&<span className="comment-stale">⚠ À revoir · ancienne révision {item.baseRevision}</span>}
       </div>
       {item.quote&&<blockquote>{item.quote}</blockquote>}
       <p>{item.body}</p>
       
     </article>)}</div>}
 </section>;
}
