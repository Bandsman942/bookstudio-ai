import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {
  type LibraryFilters,LibraryQueryError,
  parseLibraryFilters,scopeForFilters,decodeLibraryCursor,encodeLibraryCursor
} from './library-paging';

export {LibraryQueryError,parseLibraryFilters};
const select={id:true,title:true,bookType:true,language:true,status:true,
  updatedAt:true,archivedAt:true,workspaceId:true} as const;

/** Query only membership-authorized books; no content, source links or auth tokens. */
export async function listAccessibleBooks(userId:string,filters:LibraryFilters){
  const membership:Prisma.MembershipWhereInput=filters.editable?
    {userId,role:{in:['OWNER','EDITOR']}}:{userId};
  const workspaceScope:Prisma.BookWhereInput={
    workspace:{memberships:{some:membership}}
  };
  const membershipWhere:Prisma.BookWhereInput={
    ...workspaceScope,archivedAt:filters.archived?{not:null}:null
  };
  const filteredWhere:Prisma.BookWhereInput={
    ...membershipWhere,
    ...(filters.q?{title:{contains:filters.q,mode:'insensitive' as const}}:{}),
    ...(filters.type?{bookType:filters.type}:{}),
    ...(filters.status?{status:filters.status as Prisma.EnumBookStatusFilter['equals']}:{}),
  };
  const scope=scopeForFilters(filters);
  const cursor=filters.cursor?decodeLibraryCursor(filters.cursor,filters):null;
  let pageWhere:Prisma.BookWhereInput={...filteredWhere};
  if(cursor){
    const comparison:Prisma.BookWhereInput=filters.sort==='recent'?{
      OR:[{updatedAt:{lt:new Date(cursor.key)}},
        {updatedAt:new Date(cursor.key),id:{lt:cursor.id}}]
    }:{
      OR:[{title:{gt:cursor.key}},{title:cursor.key,id:{gt:cursor.id}}]
    };
    pageWhere={AND:[filteredWhere,comparison]};
  }
  const [rows,count,groups,editableMemberships,archivedTotal]=await Promise.all([
    prisma.book.findMany({where:pageWhere,
      orderBy:filters.sort==='recent'?[{updatedAt:'desc'},{id:'desc'}]:
        [{title:'asc'},{id:'asc'}],take:filters.limit+1,select}),
    prisma.book.count({where:filteredWhere}),
    prisma.book.groupBy({by:['status'],where:membershipWhere,_count:{_all:true}}),
    prisma.membership.findMany({where:{userId,role:{in:['OWNER','EDITOR']}},
      select:{workspaceId:true}}),
    prisma.book.count({where:{...workspaceScope,archivedAt:{not:null}}})
  ]);
  const editable=new Set(editableMemberships.map(m=>m.workspaceId));
  const hasMore=rows.length>filters.limit;
  const trimmed=rows.slice(0,filters.limit);
  const last=hasMore?trimmed[trimmed.length-1]:undefined;
  const nextCursor=last?encodeLibraryCursor(filters.sort,
    filters.sort==='recent'?last.updatedAt.toISOString():last.title,last.id,scope):null;
  const counts=Object.fromEntries(groups.map(g=>[g.status,g._count._all]));
  const total=groups.reduce((n,g)=>n+g._count._all,0);
  const byStatus={
    DRAFT:counts.DRAFT??0,WRITING:counts.WRITING??0,
    REVIEW:counts.REVIEW??0,APPROVED:counts.APPROVED??0,
    PRODUCTION:counts.PRODUCTION??0,PUBLISHED:counts.PUBLISHED??0
  };
  return {books:trimmed.map(({workspaceId,...book})=>({
    ...book,editable:editable.has(workspaceId)
  })),total:count,nextCursor,stats:{total,writing:counts.WRITING??0,
    review:counts.REVIEW??0,archived:archivedTotal,byStatus}};
}
