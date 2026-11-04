'use client';
import {useEffect,useRef,useState} from 'react';
import AppIcon from './AppIcon';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {MANUSCRIPT_ACCEPT,MANUSCRIPT_MAX_BYTES,uploadErrorCode,uploadSourceToBook,type UploadStage} from '@/lib/source-upload-client';

type BookChoice={id:string;title:string};
type Props={books:BookChoice[];onClose:()=>void;onCreateBook:()=>void;onUploaded:(bookId:string)=>void};
export default function ManuscriptImportDialog({books,onClose,onCreateBook,onUploaded}:Props){
  const {t,locale}=useAppPreferences();
  const {notify}=useToast();
  const [bookId,setBookId]=useState(books[0]?.id??'');
  const [file,setFile]=useState<File|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),
        [stage,setStage]=useState<UploadStage|null>(null);
  const picker=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)onClose();};
    document.addEventListener('keydown',escape);
    return ()=>document.removeEventListener('keydown',escape);
  },[busy,onClose]);
  const currentId=books.some(b=>b.id===bookId)?bookId:(books[0]?.id??'');
  async function submit(event:React.FormEvent){
    event.preventDefault();
    if(!currentId||!file||busy)return;
    setBusy(true);setError('');
    try{
      await uploadSourceToBook(currentId,file,setStage);
      notify({tone:'success',title:locale==='fr'?'Manuscrit transféré':'Manuscript uploaded',
        detail:locale==='fr'?'« '+file.name+' » est enregistré dans l’ouvrage choisi. Vous pouvez maintenant l’ouvrir et le réviser.':
          '“'+file.name+'” was saved to the selected book. You can now open and review it.'});
      onUploaded(currentId);
    }catch(e){
      const code=uploadErrorCode(e);
      const msg=code==='STORAGE_NOT_CONFIGURED'?t('import.notReady'):
        code==='FILE_NOT_ALLOWED_OR_TOO_LARGE'?t('import.invalid'):
        code==='SOURCE_SIZE_MISMATCH'||code==='SOURCE_TYPE_MISMATCH'?t('import.mismatch'):
        code==='NOT_FOUND_OR_FORBIDDEN'||code==='UNAUTHENTICATED'?t('import.forbidden'):
        t('import.failed');
      setError(msg);
      notify({tone:'error',title:locale==='fr'?'Importation du manuscrit interrompue':'Manuscript upload interrupted',
        detail:(file.name?file.name+' : ':'')+msg});
    }finally{setBusy(false);setStage(null);}
  }
  const stageLabel=stage==='authorizing'?t('import.authorizing'):
    stage==='transferring'?t('import.transferring'):t('import.confirming');
  return <div className="modal-backdrop import-backdrop" onMouseDown={e=>{
    if(e.target===e.currentTarget&&!busy)onClose();
  }}>
    <form role="dialog" aria-modal="true" aria-labelledby="import-dialog-title"
      className="modal import-modal" onSubmit={e=>void submit(e)}>
      <button type="button" className="close" disabled={busy} aria-label={t('common.close')} onClick={onClose}>×</button>
      <span className="eyebrow">{t('import.eyebrow')}</span>
      <h2 id="import-dialog-title"><AppIcon name="upload" size={24}/> {t('import.title')}</h2>
      <p>{t('import.intro')}</p>
      {books.length===0?<div className="import-empty">
        <AppIcon name="book" size={28}/><p>{t('import.noBook')}</p>
        <button type="button" className="button" onClick={onCreateBook}><AppIcon name="plus"/>{t('import.createBook')}</button>
      </div>:<>
        <label htmlFor="import-book">{t('import.bookLabel')}
          <select id="import-book" autoFocus value={currentId} disabled={busy} onChange={e=>setBookId(e.target.value)}>
            {books.map(book=><option key={book.id} value={book.id}>{book.title}</option>)}
          </select>
        </label>
        <label htmlFor="import-file">{t('import.fileLabel')}
          <input id="import-file" ref={picker} type="file" disabled={busy}
            accept={MANUSCRIPT_ACCEPT} onChange={e=>{setFile(e.target.files?.[0]??null);setError('');}}/>
        </label>
        <p className="source-note">{t('import.formats')}</p>
        {file&&<p className="import-chosen"><AppIcon name="manuscript"/><strong>{file.name}</strong></p>}
        <p className="import-disclaimer"><AppIcon name="shield"/>{t('import.notConverted')}</p>
        {error&&<p className="form-error" role="alert">{error}</p>}
        {busy&&<p role="status" className="source-note">{stageLabel}</p>}
        <button type="submit" className="button full" disabled={!file||!currentId||busy||file.size>MANUSCRIPT_MAX_BYTES}>
          <AppIcon name="upload" size={18}/>{busy?stageLabel:t('import.submit')}
        </button>
        {file&&file.size>MANUSCRIPT_MAX_BYTES&&<p className="form-error" role="alert">{t('import.invalid')}</p>}
      </>}
    </form>
  </div>;
}
