import {redirect} from 'next/navigation';
import {activeUser} from '@/lib/auth';
import {prisma} from '@bookstudio/database';
import LibraryClient from '@/components/LibraryClient';
export const dynamic='force-dynamic';
export default async function Library(){
  const user=await activeUser();if(!user)redirect('/login');
  const books=await prisma.book.findMany({where:{archivedAt:null,workspace:{memberships:{some:{userId:user.id}}}},orderBy:{updatedAt:'desc'},take:100,select:{id:true,title:true,bookType:true,status:true,updatedAt:true}});
  return <LibraryClient displayName={user.name} books={books.map(b=>({...b,updatedAt:b.updatedAt.toISOString()}))}/>;
}
