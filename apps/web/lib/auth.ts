import { cookies } from 'next/headers';
import { prisma } from '@bookstudio/database';
import { hashToken, sessionCookieName } from './security';
export async function activeUser() {
  const jar = await cookies();
  const cookie = jar.get(sessionCookieName)?.value;
  if (!cookie) return null;
  const session = await prisma.session.findUnique({where:{tokenHash:hashToken(cookie)},include:{user:true}});
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') return null;
  return session.user;
}
export async function accessToBook(bookId: string, userId: string, write = false) {
  return prisma.book.findFirst({
    where:{id:bookId,archivedAt:null,workspace:{memberships:{some:{userId,role:{in:write?['OWNER','EDITOR']:['OWNER','EDITOR','REVIEWER','VIEWER']}}}}},
    include:{editions:{orderBy:{number:'desc'},take:1,include:{manuscript:{include:{chapters:{orderBy:{position:'asc'}}}}}}}
  });
}
