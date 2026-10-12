import { supabaseConfig } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  const config = supabaseConfig();
  if (!config) return Response.json({configured:false,connected:false},{status:503,headers});
  try {
    // Public GoTrue metadata only. No database writes, session, or secret key.
    const result = await fetch(config.url + '/auth/v1/settings', {
      headers: { apikey: config.key },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!result.ok) throw new Error('supabase_unavailable');
    return Response.json({configured:true,connected:true},{headers});
  } catch {
    return Response.json({configured:true,connected:false},{status:503,headers});
  }
}
