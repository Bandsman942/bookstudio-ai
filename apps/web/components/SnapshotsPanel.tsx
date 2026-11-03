'use client';

import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import ActionMenu from './ActionMenu';

type Version={id:string;name:string;createdAt:string;chapterCount:number;integrityHash:string};
type Chapter={id:string;revision:number};

export default function SnapshotsPanel({bookId,editable}:{bookId:string;editable:boolean}){
  const [versions,setVersions]=useState<Version[]>([]);
  const [name,setName]=useState('');
  const [busy,setBusy]=useState(false);
  const [pendingRestore,setPendingRestore]=useState<Version|null>(null);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const router=useRouter();
  const refresh=useCallback(async()=>{
    const response=await fetch('/api/v1/books/'+bookId+'/snapshots',{cache:'no-store'});
    if(!response.ok)throw new Error('Les versions sont momentanément indisponibles.');
    const payload=await response.json();
    setVersions(payload.snapshots);
  },[bookId]);
  useEffect(()=>{refresh().catch(()=>setError('Impossible de charger les versions.'));},[refresh]);

  async function create(event:React.FormEvent){
    event.preventDefault();
    if(!editable||!name.trim())return;
    setBusy(true);setError('');setMessage('');
    try{
      const response=await fetch('/api/v1/books/'+bookId+'/snapshots',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:name.trim()})
      });
      const payload=await response.json();
      if(!response.ok){setError(payload.error||'Création du point impossible.');return;}
      setName('');setMessage('Version enregistrée et vérifiable.');
      await refresh();
    }catch{setError('Connexion interrompue : aucune version confirmée.');}
    finally{setBusy(false);}
  }

  async function restore(version:Version){
    if(!editable||busy)return;
    setBusy(true);setError('');setMessage('');
    try{
      const current=await fetch('/api/v1/books/'+bookId+'/chapters',{cache:'no-store'});
      if(!current.ok)throw new Error('Impossible de vérifier les révisions courantes.');
      const manifest=await current.json();
      const expectedRevisions:Record<string,number>={};
      for(const chapter of manifest.chapters as Chapter[])expectedRevisions[chapter.id]=chapter.revision;
      const response=await fetch('/api/v1/books/'+bookId+'/snapshots/'+version.id+'/restore',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({confirm:'RESTORE',expectedRevisions})
      });
      const payload=await response.json();
      if(!response.ok){
        setError(response.status===409?'Conflit de versions : rechargez avant de restaurer.':(payload.error||'Restauration impossible.'));
        return;
      }
      setPendingRestore(null);
      setMessage(payload.restored+' chapitre(s) restauré(s). Les anciennes révisions sont conservées.');
      router.refresh();
    }catch(err){setError(err instanceof Error?err.message:'Restauration interrompue.');}
    finally{setBusy(false);}
  }

  return <section className="versions-section" aria-label="Versions du manuscrit">
    <div className="section-header"><h2>Versions & historique</h2>
      <span>{versions.length} version{versions.length>1?'s':''} enregistrée{versions.length>1?'s':''}</span>
    </div>
    <p className="versions-help">Enregistrez une version avant toute réorganisation. Une restauration n’efface jamais l’historique.</p>
    {editable&&<form className="versions-create" onSubmit={create}>
      <label htmlFor="snapshot-name" className="sr-only">Nom de la nouvelle version</label>
      <input id="snapshot-name" required minLength={2} maxLength={140} value={name}
        onChange={event=>setName(event.target.value)} placeholder="Ex. Manuscrit avant relecture"/>
      <button className="button small" type="submit" disabled={busy}>{busy?'Enregistrement…':'＋ Créer une version'}</button>
    </form>}
    {error&&<div className="form-error" role="alert">{error}</div>}
    {message&&<p role="status" className="versions-success">{message}</p>}
    <div className="versions-list">
      {versions.length===0?<p className="versions-empty">Aucune version enregistrée pour ce livre.</p>:
        versions.map(version=><div className="version-row" key={version.id}>
          <div className="version-icon" aria-hidden="true">↺</div>
          <div className="version-details"><strong>{version.name}</strong>
            <small>{new Date(version.createdAt).toLocaleString('fr-FR')} · {version.chapterCount} chapitre(s) · Empreinte {version.integrityHash.slice(0,10)}</small>
          </div>
          <ActionMenu label={'Actions pour la version « '+version.name+' »'} disabled={busy} actions={[
            {label:'Télécharger · PDF',href:'/api/v1/books/'+bookId+'/snapshots/'+version.id+'/export?format=pdf',group:'EXPORTER'},
            {label:'Télécharger · Word',href:'/api/v1/books/'+bookId+'/snapshots/'+version.id+'/export?format=docx'},
            {label:'Télécharger · Markdown',href:'/api/v1/books/'+bookId+'/snapshots/'+version.id+'/export?format=md'},
            ...(editable?[{label:'Restaurer cette version…',separatorBefore:true,
              onSelect:()=>{setError('');setPendingRestore(version);}}]:[])
          ]}/>
        </div>)}
    </div>
    {pendingRestore&&<div className="modal-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target&&!busy)setPendingRestore(null);}}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Confirmer la restauration">
        <button className="close" type="button" disabled={busy} aria-label="Fermer" onClick={()=>setPendingRestore(null)}>×</button>
        <div className="eyebrow">RESTAURATION DE VERSION</div>
        <h2>Restaurer « {pendingRestore.name} » ?</h2>
        <p>De nouvelles révisions seront créées sans supprimer les précédentes. Les chapitres ajoutés depuis resteront présents.</p>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="button full" type="button" disabled={busy} onClick={()=>void restore(pendingRestore)}>
          {busy?'Restauration…':'Confirmer la restauration'}
        </button>
        <button className="text-button" type="button" disabled={busy} onClick={()=>setPendingRestore(null)}>Annuler</button>
      </div>
    </div>}
  </section>;
}
