'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAppPreferences} from './AppPreferences';

type Item={name:string;size:number;createdAt:string|null};
type ApiError={error?:string};
const MAX_BYTES=20*1024*1024;
const text={
  fr:{heading:'Fichiers sources',explain:'Vos documents sont enregistrés dans un espace privé Supabase Storage. Aucun fichier n’est stocké sur Vercel.',
    choose:'Choisir un fichier',uploading:'Envoi direct vers Supabase…',empty:'Aucun fichier source pour cet ouvrage.',
    refresh:'Actualiser',download:'Télécharger',remove:'Supprimer',busy:'Chargement…',
    notReady:'La liaison Supabase Storage n’est pas encore configurée sur le serveur.',
    error:'Connexion au stockage momentanément indisponible. Réessayez.',tooLarge:'Fichier non pris en charge ou supérieur à 20 Mo.',
    uploaded:'Fichier confirmé par le serveur.',uploadFailed:'Transfert interrompu : fichier non confirmé. Réessayez.',
    mismatch:'Fichier reçu, mais taille ou type non conforme. Le fichier n’est pas confirmé.',
    confirm:'Supprimer définitivement ce fichier source ?',restricted:'Formats : DOCX, PDF, TXT, MD, EPUB, ODT, PNG, JPG, WEBP · 20 Mo maximum.',
    notImported:'La présence dans Storage ne déclenche pas encore la conversion du document dans les chapitres.',
    deleted:'Fichier supprimé.'},
  en:{heading:'Source files',explain:'Your files live in private Supabase Storage. Vercel does not store uploaded binaries.',
    choose:'Choose a file',uploading:'Uploading directly to Supabase…',empty:'No source files for this book.',
    refresh:'Refresh',download:'Download',remove:'Delete',busy:'Loading…',
    notReady:'Supabase Storage is not configured on the server yet.',
    error:'Storage is temporarily unavailable. Please retry.',tooLarge:'Unsupported file or larger than 20 MB.',
    uploaded:'File confirmed by the server.',uploadFailed:'Transfer interrupted: upload not confirmed. Retry.',
    mismatch:'File received, but size or type does not match. The file is not confirmed.',
    confirm:'Permanently delete this source file?',restricted:'Formats: DOCX, PDF, TXT, MD, EPUB, ODT, PNG, JPG, WEBP · 20 MB max.',
    notImported:'Storing a source file does not yet convert its content into editable chapters.',
    deleted:'File deleted.'}
};
function shortName(stored:string){return stored.replace(/^[0-9a-f-]{36}-/i,'');}
function humanSize(size:number){return size<1024?size+' B':size<1048576?Math.round(size/1024)+' KB':(size/1048576).toFixed(1)+' MB';}

export default function BookSourceFiles({bookId,editable}:{bookId:string;editable:boolean}){
  const {locale}=useAppPreferences(),t=text[locale];
  const [files,setFiles]=useState<Item[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),
        [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const input=useRef<HTMLInputElement>(null);
  const base='/api/v1/books/'+bookId+'/files';
  const refresh=useCallback(async()=>{
    try{
      const response=await fetch(base,{cache:'no-store'});
      const data=await response.json() as {files?:Item[];error?:string};
      if(!response.ok)throw new Error(data.error);
      setFiles(Array.isArray(data.files)?data.files:[]);
      setError('');
    }catch(e){setError(e instanceof Error&&e.message==='STORAGE_NOT_CONFIGURED'?text[locale].notReady:text[locale].error);}
    finally{setLoading(false);}
  },[base,locale]);
  useEffect(()=>{void refresh();},[refresh]);
  async function send(file:File){
    setBusy(true);setError('');setNotice('');
    try{
      if(!file.size||file.size>MAX_BYTES){setError(t.tooLarge);return;}
      const ticket=await fetch(base,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:file.name,size:file.size,type:file.type})
      });
      const data=await ticket.json() as {name?:string;url?:string;contentType?:string;error?:string};
      if(!ticket.ok){
        setError(data.error==='STORAGE_NOT_CONFIGURED'?t.notReady:
          data.error==='FILE_NOT_ALLOWED_OR_TOO_LARGE'?t.tooLarge:t.error);return;
      }
      if(!data.url||!data.name||!data.contentType)throw Error('NO_TICKET');
      // The binary goes from the browser straight to Supabase, never through a Vercel function.
      const uploaded=await fetch(data.url,{
        method:'PUT',headers:{'Content-Type':data.contentType,'x-upsert':'false'},
        body:file
      });
      if(!uploaded.ok)throw Error('TRANSFER_FAILED');
      // The server checks Storage metadata; a successful PUT alone is NOT a verified source.
      const confirmation=await fetch(base,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'confirm',name:data.name,size:file.size,type:data.contentType})
      });
      if(!confirmation.ok){
        const failure=await confirmation.json().catch(()=>({})) as ApiError;
        await refresh();
        setError(failure.error==='SOURCE_SIZE_MISMATCH'||failure.error==='SOURCE_TYPE_MISMATCH'?
          t.mismatch:t.uploadFailed);
        return;
      }
      await refresh();
      setNotice(t.uploaded);
    }catch{setError(t.uploadFailed);}
    finally{setBusy(false);if(input.current)input.current.value='';}
  }
  async function act(action:'download'|'delete',name:string){
    if(action==='delete'&&!window.confirm(t.confirm))return;
    setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch(base,{
        method:action==='delete'?'DELETE':'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(action==='delete'?{name}:{action:'download',name})
      });
      const data=await response.json() as {url?:string;error?:string};
      if(!response.ok)throw Error(data.error);
      if(action==='download'){
        if(!data.url)throw Error('NO_URL');
        window.location.assign(data.url);
      }else{await refresh();setNotice(t.deleted);}
    }catch{setError(t.error);}
    finally{setBusy(false);}
  }
  return <section className="source-files" aria-labelledby="source-files-title">
    <div className="section-header"><h2 id="source-files-title">{t.heading}</h2>
      <button type="button" className="text-button" disabled={busy||loading} onClick={()=>void refresh()}>{t.refresh}</button>
    </div>
    <p className="source-note">{t.explain}</p>
    {editable&&<div className="source-controls">
      <label className="button small" htmlFor={'source-input-'+bookId}>{busy?t.uploading:t.choose}</label>
      <input id={'source-input-'+bookId} ref={input} type="file" disabled={busy} aria-label={t.choose}
        accept=".docx,.pdf,.txt,.md,.epub,.odt,.png,.jpg,.jpeg,.webp"
        onChange={event=>{const file=event.target.files?.[0];if(file)void send(file);}}/>
      <small>{t.restricted}</small>
    </div>}
    {error&&<p className="form-error" role="alert">{error}</p>}
    {notice&&<p className="source-success" role="status">{notice}</p>}
    {loading?<p className="source-note">{t.busy}</p>:
      files.length===0?<p className="source-note">{t.empty}</p>:
      <ul className="source-list">{files.map(f=><li key={f.name}>
        <span title={shortName(f.name)} className="source-filename">▤ {shortName(f.name)}</span>
        <small>{humanSize(f.size)}</small>
        <div className="source-actions">
          <button type="button" className="text-button" disabled={busy} onClick={()=>void act('download',f.name)}>{t.download}</button>
          {editable&&<button type="button" className="text-button" disabled={busy} onClick={()=>void act('delete',f.name)}>{t.remove}</button>}
        </div>
      </li>)}</ul>}
    <p className="source-note">{t.notImported}</p>
  </section>;
}
