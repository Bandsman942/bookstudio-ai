import { prisma } from '@bookstudio/database';
import { activeUser, accessToBook } from '@/lib/auth';
import { errorResponse } from '@/lib/security';
import { manifestHash, parseSnapshotManifest } from '@/lib/snapshots';
import { renderDocx, renderMarkdown, type ExportChapter } from '@/lib/docx-export';
import { renderReadingPdf, UnsupportedPdfGlyph } from '@/lib/pdf-export';

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
  if(format!=='docx' && format!=='md' && format!=='pdf')return errorResponse('EXPORT_FORMAT_UNSUPPORTED',400);

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
    const partTitles=new Map<string,string>(manifest.schema==='bookstudio.snapshot.v2'
      ?manifest.parts.map(part=>[part.id,part.title] as const):[]);
    const sorted=manifest.chapters.map(item=>({...item,
      partId:'partId' in item&&typeof item.partId==='string'?item.partId:null}))
      .sort((a,b)=>a.position-b.position);
    let previousPart:string|null=null;
    let total=0;
    const chapters:ExportChapter[]=[];
    for(const item of sorted){
      const source=map.get(item.chapterId+':'+item.revisionSeq);
      if(!source||source.contentHash!==item.contentHash)return errorResponse('SNAPSHOT_CORRUPT',409);
      total+=Buffer.byteLength(source.text,'utf8');
      if(total>8*1024*1024)return errorResponse('EXPORT_TOO_LARGE',413);
      const partId=item.partId;
      chapters.push({title:item.title,content:source.content,
        withinPart:Boolean(partId),
        ...(partId&&partId!==previousPart?{partTitle:partTitles.get(partId)}:{})});
      previousPart=partId;
    }
    const bytes = format==='pdf' ? await renderReadingPdf(book.title,chapters) : format==='docx' ? renderDocx(book.title,chapters) : new TextEncoder().encode(renderMarkdown(book.title,chapters));
    return new Response(new Uint8Array(bytes),{
      status:200,
      headers:{
        'Content-Type':format==='docx'
          ?'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          :format==='pdf' ? 'application/pdf' : 'text/markdown; charset=utf-8',
        'Content-Disposition':'attachment; filename="bookstudio-'+snapshotId+'.'+format+'"',
        'Cache-Control':'private, no-store, max-age=0',
        'X-Content-Type-Options':'nosniff'
      }
    });
  }catch(error){
    if(error instanceof UnsupportedPdfGlyph)return errorResponse('EXPORT_UNSUPPORTED_GLYPHS',422,{
      // No manuscript excerpts/titles: only the Unicode point(s) and position.
      codepoints:error.codepoints.slice(0,80),chapterNumber:error.chapterNumber??null
    });
    if(error instanceof Error && error.message==='EXPORT_TOO_LARGE')return errorResponse('EXPORT_TOO_LARGE',413);
    return errorResponse('EXPORT_FAILED',503);
  }
}
