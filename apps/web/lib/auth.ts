import { cookies } from 'next/headers';
import { cache } from 'react';
import { prisma } from '@bookstudio/database';
import { hashToken, sessionCookieName } from './security';

/**
 * Cache is request-scoped by React; it MUST NOT be replaced by a global Map,
 * unstable_cache or other cross-user/session cache.
 */
export const activeUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(sessionCookieName)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where:{tokenHash:hashToken(token)},
    select:{
      revokedAt:true,expiresAt:true,
      user:{select:{id:true,name:true,email:true,status:true}}
    }
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') return null;
  return session.user;
});

export async function accessToBook(bookId: string, userId: string, write = false) {
  return prisma.book.findFirst({
    where:{
      id:bookId,archivedAt:null,
      workspace:{memberships:{some:{
        userId,role:{in:write?['OWNER','EDITOR']:['OWNER','EDITOR','REVIEWER','VIEWER']}
      }}}
    },
    include:{
      // Reuse this relation in RSC pages instead of a second full accessToBook query.
      workspace:{select:{memberships:{where:{userId},select:{role:true}}}},
      editions:{orderBy:{number:'desc'},take:1,
        include:{manuscript:{include:{chapters:{where:{deletedAt:null},orderBy:{position:'asc'}}}}}}
    }
  });
}
export function canWriteBook(book:{workspace:{memberships:{role:string}[]}}) {
  return book.workspace.memberships.some(member=>member.role==='OWNER'||member.role==='EDITOR');
}
