'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAppPreferences} from './AppPreferences';
import AppIcon from './AppIcon';
import DocxPreviewDialog from './DocxPreviewDialog';
import {
  MANUSCRIPT_ACCEPT,uploadSourceToBook,uploadErrorCode,
  type UploadStage
} from '@/lib/source-upload-client';

type ScanStatus='UNSCANNED'|'QUEUED'|'SCANNING'|'SCANNED_CLEAN'|'REJECTED'|'SCAN_UNAVAILABLE';
type Item={name:string;size:number;createdAt:string|null;scanStatus?:ScanStatus};
const text={
  fr:{heading:'Fichiers sources',action:'Importer un manuscrit',
    explain:'Ajoutez ici le fichier original de votre livre. Il est enregistré directement dans votre espace privé Supabase Storage.',
    choose:'Choisir un manuscrit',drop:'Glissez votre fichier ici, ou choisissez-le dans votre appareil.',
    uploading:'Envoi direct vers Supabase…',authorizing:'Vérification des autorisations…',
    confirming:'Vérification du fichier auprès du serveur…',
    empty:'Aucun fichier source pour cet ouvrage.',refresh:'Actualiser',download:'Télécharger',preview:'Prévisualiser DOCX',
    remove:'Supprimer',busy:'Chargement…',notReady:'La liaison Supabase Storage n’est pas encore configurée.',
    error:'Stockage momentanément indisponible. Réessayez.',
    tooLarge:'Format non autorisé ou fichier supérieur à 20 Mio.',
    uploaded:'Fichier reçu et enregistré ; analyse antivirus non effectuée.',uploadFailed:'Transfert interrompu : fichier non confirmé. Réessayez.',
    mismatch:'Fichier reçu, mais taille ou type non conforme : aucune confirmation.',
    forbidden:'Accès au stockage refusé pour cet ouvrage.',
    confirm:'Supprimer définitivement ce fichier source ?',
    restricted:'DOCX, PDF, TXT, MD, EPUB, ODT, PNG, JPG, WEBP · 20 Mio maximum.',
    notImported:'La confirmation du stockage ne constitue pas une analyse antivirus. Les fichiers DOCX peuvent être relus et convertis après revue de l’auteur.',
    scanRequired:'Mode strict : les sources non analysées ne peuvent pas être utilisées tant qu’un moteur antivirus isolé n’est pas opérationnel.',
    scanBlocked:'Téléchargement ou importation interdits tant que la source ne dispose pas d’un contrôle antivirus fiable.',
    scanStatus:{UNSCANNED:'Analyse antivirus non effectuée',QUEUED:'Analyse demandée — non terminée',
      SCANNING:'Analyse en cours — non vérifiée',SCANNED_CLEAN:'Analyse terminée sans détection',
      REJECTED:'Fichier rejeté par l’analyse',SCAN_UNAVAILABLE:'Service d’analyse indisponible'},
    deleted:'Fichier supprimé.'},
  en:{heading:'Source files',action:'Import a manuscript',
    explain:'Add the original document for your book. It is uploaded directly to your private Supabase Storage.',
    choose:'Choose manuscript',drop:'Drop your manuscript here or choose a file from your device.',
    uploading:'Uploading directly to Supabase…',authorizing:'Checking permissions…',
    confirming:'Verifying the file with the server…',
    empty:'No source files for this book.',refresh:'Refresh',download:'Download',preview:'Preview DOCX',
    remove:'Delete',busy:'Loading…',notReady:'Supabase Storage is not configured.',
    error:'Storage is temporarily unavailable. Please retry.',
    tooLarge:'Unsupported type or larger than 20 MiB.',
    uploaded:'File saved to storage; antivirus scan has not been performed.',uploadFailed:'Transfer interrupted: file not confirmed. Please retry.',
    mismatch:'File received, but size or MIME type differs: not confirmed.',
    forbidden:'Storage access denied for this book.',
    confirm:'Permanently delete this source file?',
    restricted:'DOCX, PDF, TXT, MD, EPUB, ODT, PNG, JPG, WEBP · 20 MiB max.',
    notImported:'Storage confirmation is not an antivirus scan. DOCX files can be reviewed and converted by the author.',
    scanRequired:'Strict mode: unscanned sources cannot be used until an isolated antivirus service is available.',
    scanBlocked:'Downloading or importing requires reliable antivirus clearance.',
    scanStatus:{UNSCANNED:'Antivirus scan not performed',QUEUED:'Scan queued — not complete',
      SCANNING:'Scanning — not verified',SCANNED_CLEAN:'Scan finished with no detection',
      REJECTED:'File rejected by scanner',SCAN_UNAVAILABLE:'Scan service unavailable'},
    deleted:'File deleted.'}
};
function shortName(stored:string){return stored.replace(/^[0-9a-f-]{36}-/i,'');}
function humanSize(size:number){return size<1024?size+' B':size<1048576?Math.round(size/1024)+' KB':(size/1048576).toFixed(1)+' MB';}

export default function BookSourceFiles({bookId,editable}:{bookId:string;editable:boolean}){
  const {locale}=useAppPreferences(),t=text[locale];
  const [files,setFiles]=useState<Item[]>([]),[scanRequired,setScanRequired]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),
        [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[dragging,setDragging]=useState(false),
        [stage,setStage]=useState<UploadStage|null>(null);
  const input=useRef<HTMLInputElement>(null);
  const [previewName,setPreviewName]=useState<string|null>(null);
  const base='/api/v1/books/'+bookId+'/files';
  const refresh=useCallback(async()=>{
    try{
      const response=await fetch(base,{cache:'no-store'});
      const data=await response.json() as {files?:Item[];scanRequired?:boolean;error?:string};
      if(!response.ok)throw new Error(data.error);
      setFiles(Array.isArray(data.files)?data.files:[]);
      setScanRequired(data.scanRequired===true);
      setError('');
    }catch(e){
      setError(e instanceof Error&&e.message==='STORAGE_NOT_CONFIGURED'?
        text[locale].notReady:text[locale].error);
    }finally{setLoading(false);}
  },[base,locale]);
  useEffect(()=>{void refresh();},[refresh]);
  async function send(file:File){
    if(!editable||busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      await uploadSourceToBook(bookId,file,setStage);
      await refresh();
      setNotice(t.uploaded);
    }catch(e){
      const code=uploadErrorCode(e);
      await refresh();
      setError(code==='STORAGE_NOT_CONFIGURED'?t.notReady:
        code==='FILE_NOT_ALLOWED_OR_TOO_LARGE'?t.tooLarge:
        code==='SOURCE_TYPE_MISMATCH'||code==='SOURCE_SIZE_MISMATCH'?t.mismatch:
        code==='UNAUTHENTICATED'||code==='NOT_FOUND_OR_FORBIDDEN'?t.forbidden:
        t.uploadFailed);
    }finally{
      setBusy(false);setStage(null);
      if(input.current)input.current.value='';
    }
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
    }catch(e){setError(e instanceof Error&&e.message==='SOURCE_SCAN_REQUIRED'?t.scanBlocked:t.error);}
    finally{setBusy(false);}
  }
  const stageLabel=stage==='authorizing'?t.authorizing:
    stage==='transferring'?t.uploading:t.confirming;
  return <section id="book-source-files" className="source-files" aria-labelledby="source-files-title">
    <div className="section-header">
      <h2 id="source-files-title"><AppIcon name="files" size={21}/>{t.heading}</h2>
      <button type="button" className="text-button" disabled={busy||loading} onClick={()=>void refresh()}>
        <AppIcon name="refresh" size={15}/>{t.refresh}
      </button>
    </div>
    <p className="source-note">{t.explain}</p>
    {scanRequired&&<p role="status" className="source-note source-scan-strict"><AppIcon name="shield" size={15}/>{t.scanRequired}</p>}
    {editable&&<div className={'source-dropzone'+(dragging?' is-dragging':'')}
      onDragOver={event=>{event.preventDefault();if(!busy)setDragging(true);}}
      onDragLeave={event=>{
        if(!event.currentTarget.contains(event.relatedTarget as Node))setDragging(false);
      }}
      onDrop={event=>{event.preventDefault();setDragging(false);
        const file=event.dataTransfer.files?.[0];if(file&&!busy)void send(file);
      }}>
      <AppIcon name="upload" size={32} className="source-dropzone-icon"/>
      <strong>{t.action}</strong>
      <p>{t.drop}</p>
      <button type="button" className="button small" disabled={busy}
        onClick={()=>input.current?.click()}><AppIcon name="folder"/>{t.choose}</button>
      <input id={'source-input-'+bookId} ref={input} type="file"
        disabled={busy} aria-label={t.choose} accept={MANUSCRIPT_ACCEPT}
        onChange={event=>{const file=event.target.files?.[0];if(file)void send(file);}}/>
      <small>{t.restricted}</small>
    </div>}
    {busy&&<p role="status" aria-live="polite" className="source-note">{stageLabel}</p>}
    {error&&<p className="form-error" role="alert">{error}</p>}
    {notice&&<p className="source-success" role="status"><AppIcon name="check"/>{notice}</p>}
    {loading?<p className="source-note">{t.busy}</p>:
      files.length===0?<p className="source-note">{t.empty}</p>:
      <ul className="source-list">{files.map(f=><li key={f.name}>
        <span title={shortName(f.name)} className="source-filename"><AppIcon name="manuscript"/>{shortName(f.name)}</span>
        <small>{humanSize(f.size)}</small>
        <small className="source-scan-status"><AppIcon name="shield" size={14}/>{t.scanStatus[f.scanStatus??'UNSCANNED']}</small>
        <div className="source-actions">
          {f.name.toLowerCase().endsWith('.docx')&&<button type="button" className="text-button" disabled={busy}
            onClick={()=>setPreviewName(f.name)}><AppIcon name="search" size={15}/>{t.preview}</button>}
          <button type="button" className="text-button" disabled={busy}
            onClick={()=>void act('download',f.name)}><AppIcon name="download" size={15}/>{t.download}</button>
          {editable&&<button type="button" className="text-button" disabled={busy}
            onClick={()=>void act('delete',f.name)}><AppIcon name="trash" size={15}/>{t.remove}</button>}
        </div>
      </li>)}</ul>}
    <p className="source-note source-disclaimer"><AppIcon name="shield" size={17}/>{t.notImported}</p>
    {previewName&&<DocxPreviewDialog bookId={bookId} name={previewName} editable={editable} onClose={()=>setPreviewName(null)}/>}
  </section>;
}
