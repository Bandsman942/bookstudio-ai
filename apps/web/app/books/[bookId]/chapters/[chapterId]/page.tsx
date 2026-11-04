import {redirect,notFound} from 'next/navigation';
import {activeUser,accessToBook,canWriteBook} from '@/lib/auth';
import {prisma} from '@bookstudio/database';
import StudioEditor from '@/components/StudioEditor';
export const dynamic='force-dynamic';
export default async function ChapterPage({params}:{params:Promise<{bookId:string;chapterId:string}>}){
  const user=await activeUser();if(!user)redirect('/login');
  const {bookId,chapterId}=await params,book=await accessToBook(bookId,user.id);
  const chapters=book?.editions[0]?.manuscript?.chapters??[],chapter=chapters.find(c=>c.id===chapterId);
  if(!book||!chapter)notFound();
  const revision=await prisma.documentRevision.findUnique({where:{chapterId_sequence:{chapterId,sequence:chapter.revisionSeq}}});
  if(!revision)notFound();
  const canEdit=canWriteBook(book);
  return <StudioEditor key={chapterId} bookId={bookId} bookTitle={book.title} chapterId={chapterId} chapterTitle={chapter.title}
    revision={chapter.revisionSeq} initialContent={revision.content as Record<string,unknown>}
    chapters={chapters.map(c=>({id:c.id,title:c.title,updatedAt:c.updatedAt.toISOString(),revision:c.revisionSeq}))} canEdit={canEdit}/>;
}
