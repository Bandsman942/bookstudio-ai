'use client';
import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';

type Version={id:string;name:string;createdAt:string;chapterCount:number;integrityHash:string};
type Chapter={id:string;revision:number};

export default function SnapshotsPanel({bookId}:{bookId:string}){
  const [versions,setVersions]=useState<Version[]>([]);
  const [name,setName]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const router=useRouter();
  const refresh=useCallback(async()=>{
    const response=await fetch('/api/v1/books/'+bookId+'/snapshots',{cache:'no-store'});
    if(!response.ok)throw new Error('Les versions sont momentanément indisponibles.');
    const body=await response.json();
    setVersions(body.snapshots);
  },[bookId]);
  useEffect(()=>{refresh().catch(()=>setError('Impossible de charger les versions.'));},[refresh]);

  async function create(e:React.FormEvent){
    e.preventDefault();
    if(!name.trim())return;
    setBusy(true);setError('');setMessage('');
    try{
      const response=await fetch('/api/v1/books/'+bookId+'/snapshots',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:name.trim()})
      });
      const body=await response.json();
      if(!response.ok){setError(body.error||'Création du point impossible.');return;}
      setName('');setMessage('Point de restauration enregistré et vérifiable.');
      await refresh();
    }catch{setError('Connexion interrompue : aucun point confirmé.');}
    finally{setBusy(false);}
  }

  async function restore(version:Version){
    if(!window.confirm('Restaurer « '+version.name+' » ? Cette opération crée de nouvelles révisions et conserve tout l’historique. Les chapitres ajoutés depuis resteront présents.'))return;
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
      const body=await response.json();
      if(!response.ok){
        setError(response.status===409?'Conflit ou changement du livre : rechargez avant de restaurer.':(body.error||'Restauration impossible.'));
        return;
      }
      setMessage(body.restored+' chapitre(s) restauré(s). Les anciennes révisions ont été conservées.');
      router.refresh();
    }catch(err){setError(err instanceof Error?err.message:'Restauration interrompue.');}
    finally{setBusy(false);}
  }

  return <section className="versions-section" aria-label="Versions du manuscrit">
    <div className="section-header"><h2>Versions & historique</h2><span>{versions.length} point{versions.length>1?'s':''} enregistré{versions.length>1?'s':''}</span></div>
    <p className="versions-help">Enregistrez un état cohérent du livre avant une réorganisation. Une restauration n'efface jamais l'historique.</p>
    <form className="versions-create" onSubmit={create}>
      <label htmlFor="snapshot-name" className="sr-only">Nom du point de restauration</label>
      <input id="snapshot-name" required minLength={2} maxLength={140} value={name} onChange={e=>setName(e.target.value)}
        placeholder="Ex. Manuscrit avant relecture scientifique" />
      <button type="submit" className="button small" disabled={busy}>{busy?'Opération…':'＋ Créer une version'}</button>
    </form>
    {error&&<div role="alert" className="form-error">{error}</div>}
    {message&&<p role="status" className="versions-success">{message}</p>}
    <div className="versions-list">
      {versions.length===0?<p className="versions-empty">Aucune version nommée. Le premier point de restauration peut être créé dès maintenant.</p>:
        versions.map(v=><div className="version-row" key={v.id}>
          <div className="version-icon" aria-hidden="true">↺</div>
          <div className="version-details"><strong>{v.name}</strong>
            <small>{new Date(v.createdAt).toLocaleString('fr-FR')} · {v.chapterCount} chapitre(s) · Empreinte {v.integrityHash.slice(0,10)}</small>
          </div>
          <div className="version-actions">
            <a className="text-button" href={'/api/v1/books/'+bookId+'/snapshots/'+v.id+'/export?format=docx'} title="Télécharger la version Word">Word</a>
            <a className="text-button" href={'/api/v1/books/'+bookId+'/snapshots/'+v.id+'/export?format=md'} title="Télécharger la version Markdown">Markdown</a>
            <button className="text-button" type="button" disabled={busy} onClick={()=>restore(v)}>Restaurer</button>
          </div>
        </div>)}
    </div>
  </section>;
}
