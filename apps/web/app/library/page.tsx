import {redirect} from 'next/navigation';
import {activeUser} from '@/lib/auth';
import {listAccessibleBooks,parseLibraryFilters} from '@/lib/library-books';
import LibraryClient from '@/components/LibraryClient';

export const dynamic='force-dynamic';

export default async function Library(){
  const user=await activeUser();if(!user)redirect('/login');
  const first=await listAccessibleBooks(user.id,
    parseLibraryFilters(new URLSearchParams({limit:'24'}),24));
  return <LibraryClient displayName={user.name}
    initialTotal={first.total} initialNextCursor={first.nextCursor}
    initialStats={first.stats}
    books={first.books.map(book=>({
      ...book,updatedAt:book.updatedAt.toISOString()
    }))}/>;
}
