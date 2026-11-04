/** Localized action/error copy. Never pass raw API response text or manuscript contents. */
export type Operation=
  'pdf'|'docx'|'markdown'|'snapshot-create'|'snapshot-restore'|'snapshot-list'|
  'book-create'|'book-rename'|'book-archive'|'book-restore'|'chapter-create'|'chapter-rename'|'chapter-delete'|'chapter-restore'|'source-upload'|'source-list'|'source-download'|'source-delete'|
  'docx-import'|'comment-add'|'comment-change'|'comment-list'|'editor-save'|'authentication';
export type Issue={locale:'fr'|'en';operation:Operation;status?:number;code?:string;
  codepoints?:string;chapterNumber?:number|null};
const actions={
 fr:{
  pdf:'l’export PDF',docx:'l’export Word',markdown:'l’export Markdown',
  'snapshot-create':'l’enregistrement de la version','snapshot-restore':'la restauration de la version',
  'snapshot-list':'le chargement de l’historique','book-create':'la création du livre',
  'book-rename':'le renommage du livre','book-archive':'l’archivage du livre','book-restore':'la restauration du livre',
  'chapter-rename':'le renommage du chapitre',
  'chapter-delete':'le retrait réversible du chapitre','chapter-restore':'la restauration du chapitre',
  'chapter-create':'la création du chapitre','source-upload':'l’importation du manuscrit',
  'source-list':'le chargement des fichiers sources','source-download':'le téléchargement du manuscrit',
  'source-delete':'la suppression du fichier source','docx-import':'la conversion du manuscrit en chapitres',
  'comment-add':'l’ajout du commentaire','comment-change':'la modification du commentaire',
  'comment-list':'le chargement des commentaires','editor-save':'l’enregistrement du chapitre',
  authentication:'la connexion à BookStudio'
 },
 en:{
  pdf:'PDF export',docx:'Word export',markdown:'Markdown export',
  'snapshot-create':'saving this version','snapshot-restore':'restoring this version',
  'snapshot-list':'loading version history','book-create':'creating this book',
  'book-rename':'renaming this book','book-archive':'archiving this book','book-restore':'restoring this book',
  'chapter-rename':'renaming this chapter',
  'chapter-delete':'removing this chapter','chapter-restore':'restoring this chapter',
  'chapter-create':'creating this chapter','source-upload':'uploading the manuscript',
  'source-list':'loading source files','source-download':'downloading the manuscript',
  'source-delete':'deleting the source file','docx-import':'turning the manuscript into chapters',
  'comment-add':'adding the comment','comment-change':'updating the comment',
  'comment-list':'loading comments','editor-save':'saving the chapter',
  authentication:'signing in to BookStudio'
 }
} as const;
const safePoints=(value?:string)=>value?.split(',').filter(x=>/^U\+[0-9A-F]{2,6}$/i.test(x)).slice(0,8).join(', ')||'';
export function explainActionError(issue:Issue):string{
 const {locale,operation,code,status}=issue;
 const label=actions[locale][operation];
 const point=safePoints(issue.codepoints);
 if(code==='EXPORT_UNSUPPORTED_GLYPHS'){
   const at=Number.isInteger(issue.chapterNumber)&&Number(issue.chapterNumber)>0?
     (locale==='fr'?' au chapitre '+issue.chapterNumber:' in chapter '+issue.chapterNumber):'';
   return locale==='fr'?
     `Un symbole${point?' ('+point+')':''}${at} n’est pas couvert par les polices PDF. Réessayez après correction de la police ou exportez la version Word, sans modifier votre texte.`:
     `A symbol${point?' ('+point+')':''}${at} is not supported by the PDF fonts. Retry after a font update or export the Word file without changing your text.`;
 }
 if(code==='EXPORT_TOO_LARGE'||status===413)return locale==='fr'?
   `Le fichier nécessaire à ${label} dépasse la limite autorisée. Divisez l’opération ou réduisez le volume du document sans effacer l’original.`:
   `The file required for ${label} exceeds its size limit. Split the operation or reduce the document size without deleting the original.`;
 if(code==='SOURCE_SCAN_REQUIRED'||status===423)return locale==='fr'?
   `Pour ${label}, le manuscrit doit d’abord disposer d’une analyse antivirus vérifiée. Le stockage seul ne prouve pas qu’il est sain.`:
   `Before ${label}, the manuscript requires a verified antivirus scan. Storage confirmation is not proof that it is safe.`;
 if(status===401)return locale==='fr'?
   `Votre session a expiré pendant ${label}. Reconnectez-vous, puis réessayez.`:
   `Your session expired during ${label}. Sign in again and retry.`;
 if(status===403||code==='NOT_FOUND_OR_FORBIDDEN')return locale==='fr'?
   `Vous n’avez pas les autorisations nécessaires pour ${label}. Vérifiez votre rôle dans cet ouvrage.`:
   `You do not have permission for ${label}. Check your role on this book.`;
 if(status===404||code==='DOCX_SOURCE_NOT_FOUND'){
   const bookAction=['book-create','book-rename','book-archive','book-restore','chapter-create','chapter-rename','chapter-delete','chapter-restore'].includes(operation);
   return locale==='fr'?(bookAction?
     `Le livre ou chapitre concerné par ${label} n’est plus disponible. Actualisez la bibliothèque avant de réessayer.`:
     `La source ou version nécessaire à ${label} n’est plus disponible. Actualisez l’ouvrage avant de réessayer.`):
     (bookAction?`The book or chapter needed for ${label} is no longer available. Refresh the library and retry.`:
     `The source or version required for ${label} is unavailable. Refresh the book and retry.`);
 }
 if(status===409||code?.includes('CONFLICT')||code==='SNAPSHOT_CORRUPT')return locale==='fr'?
   `Un changement concurrent ou une différence d’intégrité empêche ${label}. Actualisez l’historique et vérifiez la version avant de réessayer.`:
   `A concurrent change or integrity mismatch blocks ${label}. Refresh the history and verify the version before retrying.`;
 if(status===429)return locale==='fr'?
   `Trop de demandes successives pour ${label}. Attendez avant une nouvelle tentative.`:
   `Too many attempts at ${label}. Wait before trying again.`;
 if(status===503||status===502||status===504)return locale==='fr'?
   `Le service requis pour ${label} ne répond pas. Votre document original est conservé ; réessayez lorsque la connexion est stable.`:
   `The service required for ${label} is unavailable. Your original document is preserved; retry when the connection is stable.`;
 if(status===0)return locale==='fr'?
   `La connexion a été interrompue pendant ${label}. Vérifiez le réseau avant de reprendre, sans renouveler inutilement les opérations déjà confirmées.`:
   `The connection dropped during ${label}. Check your network before resuming; do not repeat operations already confirmed.`;
 return locale==='fr'?
   `Impossible de terminer ${label} (code ${status??'indisponible'}). Vérifiez les informations affichées et réessayez ; aucune réussite n’a été confirmée.`:
   `Could not complete ${label} (status ${status??'unknown'}). Review the displayed details and retry; no success has been confirmed.`;
}
