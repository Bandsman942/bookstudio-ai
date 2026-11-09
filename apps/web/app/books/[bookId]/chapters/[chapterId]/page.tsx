import {redirect,notFound} from 'next/navigation';
import {activeUser,accessToBook,canWriteBook} from '@/lib/auth';
import {prisma} from '@bookstudio/database';
import StudioEditor from '@/components/StudioEditor';
import {chapterOrderToken} from '@/lib/chapter-order';
export const dynamic='force-dynamic';
export default async function ChapterPage({params,searchParams}:{params:Promise<{bookId:string;chapterId:string}>;
  searchParams:Promise<{outlineRevision?:string;outlineOrdinal?:string}>}){
  const user=await activeUser();if(!user)redirect('/login');
  const {bookId,chapterId}=await params,book=await accessToBook(bookId,user.id);
  const chapters=book?.editions[0]?.manuscript?.chapters??[],chapter=chapters.find(c=>c.id===chapterId);
  if(!book||!chapter)notFound();
  const revision=await prisma.documentRevision.findUnique({where:{chapterId_sequence:{chapterId,sequence:chapter.revisionSeq}}});
  if(!revision)notFound();
  const canEdit=canWriteBook(book);
  const query=await searchParams;
  const revisionNumber=query.outlineRevision,ordinalNumber=query.outlineOrdinal;
  const outlineTarget=typeof revisionNumber==='string'&&/^(0|[1-9]\d*)$/.test(revisionNumber)&&
    typeof ordinalNumber==='string'&&/^(0|[1-9]\d*)$/.test(ordinalNumber)&&
    Number.isSafeInteger(Number(revisionNumber))&&Number.isSafeInteger(Number(ordinalNumber))?
    {revision:Number(revisionNumber),ordinal:Number(ordinalNumber)}:null;
  return <StudioEditor key={chapterId+':'+chapter.revisionSeq} bookId={bookId} bookTitle={book.title} chapterId={chapterId} chapterTitle={chapter.title}
    revision={chapter.revisionSeq} initialContent={revision.content as Record<string,unknown>}
    chapters={chapters.map(c=>({id:c.id,title:c.title,updatedAt:c.updatedAt.toISOString(),revision:c.revisionSeq}))} orderToken={chapterOrderToken(chapters)} canEdit={canEdit}
    outlineTarget={outlineTarget}/>;
}
