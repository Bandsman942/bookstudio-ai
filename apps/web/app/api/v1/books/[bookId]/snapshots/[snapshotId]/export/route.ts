import { prisma } from '@bookstudio/database';
import { activeUser, accessToBook } from '@/lib/auth';
import { errorResponse } from '@/lib/security';
import { manifestHash, parseSnapshotManifest } from '@/lib/snapshots';
import { renderDocx, renderMarkdown, type ExportChapter } from '@/lib/docx-export';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string,snapshotId:string}>};

export async function GET(req:Request,{params}:Ctx) {
  const user=await activeUser();
  if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId,snapshotId}=await params;
  const book=await accessToBook(bookId,user.id);
  if(!book)return errorResponse('NOT_FOUND',404);
  const format=new URL(req.url).searchParams.get('format');
  if(format!=='docx' && format!=='md')return errorResponse('EXPORT_FORMAT_UNSUPPORTED',400);

  const snapshot=await prisma.bookSnapshot.findFirst({
    where:{id:snapshotId,bookId},select:{revisionManifest:true,contentHash:true}
  });
  if(!snapshot)return errorResponse('NOT_FOUND',404);
  try {
    const manifest=parseSnapshotManifest(snapshot.revisionManifest);
    if(manifestHash(manifest)!==snapshot.contentHash) return errorResponse('SNAPSHOT_CORRUPT',409);
    const edition=await prisma.edition.findUnique({where:{id:manifest.editionId},select:{bookId:true}});
    if(!edition||edition.bookId!==bookId)return errorResponse('SNAPSHOT_EDITION_CHANGED',409);
    const sources=await prisma.documentRevision.findMany({
      where:{OR:manifest.chapters.map(c=>({chapterId:c.chapterId,sequence:c.revisionSeq}))}
    });
    const map=new Map(sources.map(r=>[r.chapterId+':'+r.sequence,r]));
    let total=0;
    const chapters:ExportChapter[]=[];
    for(const item of manifest.chapters){
      const source=map.get(item.chapterId+':'+item.revisionSeq);
      if(!source||source.contentHash!==item.contentHash)return errorResponse('SNAPSHOT_CORRUPT',409);
      total+=Buffer.byteLength(source.text,'utf8');
      if(total>8*1024*1024)return errorResponse('EXPORT_TOO_LARGE',413);
      chapters.push({title:item.title,content:source.content});
    }
    const bytes=format==='docx'?renderDocx(book.title,chapters):new TextEncoder().encode(renderMarkdown(book.title,chapters));
    return new Response(new Uint8Array(bytes),{
      status:200,
      headers:{
        'Content-Type':format==='docx'
          ?'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          :'text/markdown; charset=utf-8',
        'Content-Disposition':'attachment; filename="bookstudio-'+snapshotId+'.'+format+'"',
        'Cache-Control':'private, no-store, max-age=0',
        'X-Content-Type-Options':'nosniff'
      }
    });
  }catch{
    return errorResponse('EXPORT_FAILED',503);
  }
}
