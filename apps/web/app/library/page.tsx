import {redirect} from 'next/navigation';
import {activeUser} from '@/lib/auth';
import {prisma} from '@bookstudio/database';
import LibraryClient from '@/components/LibraryClient';

export const dynamic='force-dynamic';

export default async function Library(){
  const user=await activeUser();if(!user)redirect('/login');
  const [books,editableWorkspaces]=await Promise.all([
    prisma.book.findMany({
      where:{archivedAt:null,workspace:{memberships:{some:{userId:user.id}}}},
      orderBy:{updatedAt:'desc'},take:100,
      select:{id:true,title:true,bookType:true,language:true,status:true,updatedAt:true,workspaceId:true}
    }),
    prisma.membership.findMany({
      where:{userId:user.id,role:{in:['OWNER','EDITOR']}},select:{workspaceId:true}
    })
  ]);
  const writable=new Set(editableWorkspaces.map(m=>m.workspaceId));
  return <LibraryClient displayName={user.name}
    books={books.map(book=>({
      id:book.id,title:book.title,bookType:book.bookType,language:book.language,status:book.status,
      updatedAt:book.updatedAt.toISOString(),editable:writable.has(book.workspaceId)
    }))}/>;
}
