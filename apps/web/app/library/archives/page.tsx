import {redirect} from 'next/navigation';
import {prisma} from '@bookstudio/database';
import {activeUser} from '@/lib/auth';
import ArchivesClient from '@/components/ArchivesClient';
export const dynamic='force-dynamic';
export const metadata={title:'Archives | BookStudio AI'};
export default async function ArchivesPage(){
 const user=await activeUser();if(!user)redirect('/login');
 const editableWorkspaces=await prisma.membership.findMany({
   where:{userId:user.id,role:{in:['OWNER','EDITOR']}},select:{workspaceId:true}
 });
 const editableIds=new Set(editableWorkspaces.map(m=>m.workspaceId));
 const books=await prisma.book.findMany({
   where:{archivedAt:{not:null},workspace:{memberships:{some:{userId:user.id}}}},
   orderBy:{updatedAt:'desc'},take:100,
   select:{id:true,title:true,bookType:true,updatedAt:true,workspaceId:true}
 });
 return <ArchivesClient displayName={user.name}
   books={books.map(b=>({id:b.id,title:b.title,bookType:b.bookType,updatedAt:b.updatedAt.toISOString(),canRestore:editableIds.has(b.workspaceId)}))}/>;
}
