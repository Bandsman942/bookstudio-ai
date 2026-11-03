import { APP_VERSION, APP_CHANNEL, APP_TAG } from '@/lib/version';

export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({
    name:'BookStudio AI by DTSC',
    version:APP_VERSION,
    channel:APP_CHANNEL,
    tag:APP_TAG,
    commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12) ?? null
  },{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
