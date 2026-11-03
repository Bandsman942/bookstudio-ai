import {prisma} from '@bookstudio/database';
import {APP_VERSION} from '@/lib/version';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET() {
  const started=performance.now();
  try {
    // A cheap read-only readiness probe: verifies that the PostgreSQL
    // connection and initial schema are usable, never reveals row counts.
    await prisma.authThrottle.findFirst({select:{key:true},take:1});
    return Response.json({status:'ok',app:'bookstudio-ai',version:APP_VERSION,database:'ready'},{
      headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Server-Timing':`db;dur=${(performance.now()-started).toFixed(1)}`}
    });
  } catch {
    return Response.json({status:'unavailable',app:'bookstudio-ai',version:APP_VERSION},{
      status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
    });
  }
}
