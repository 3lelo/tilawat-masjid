export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export default {
  // Cloudflare Worker Cron Trigger (every 6 hours)
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(pingSupabase(env));
  },

  // Manual HTTP trigger for testing or health check
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health' || url.pathname === '/ping' || url.pathname === '/') {
      const result = await pingSupabase(env);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500,
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function pingSupabase(env: Env) {
  const timestamp = new Date().toISOString();
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.error(`[${timestamp}] Keep-alive error: Missing SUPABASE_URL or SUPABASE_ANON_KEY`);
    return {
      success: false,
      timestamp,
      error: 'Missing environment variables SUPABASE_URL or SUPABASE_ANON_KEY',
    };
  }

  const endpoint = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/folders?select=id&limit=1`;
  try {
    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    });

    const elapsedMs = Date.now() - startTime;
    const isOk = response.ok;
    console.log(`[${timestamp}] Supabase keep-alive ping status: ${response.status} (${elapsedMs}ms)`);

    return {
      success: isOk,
      statusCode: response.status,
      elapsedMs,
      timestamp,
      message: isOk ? 'Supabase project is active' : `Unexpected status ${response.status}`,
    };
  } catch (err: any) {
    console.error(`[${timestamp}] Supabase ping failed:`, err);
    return {
      success: false,
      timestamp,
      error: err?.message || 'Network error pinging Supabase',
    };
  }
}
