import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminUser } from '@/lib/supabaseServer';

const GITHUB_TOKEN = process.env.GITHUB_DISPATCH_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_REPO_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO_NAME;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const isAdmin = await verifyAdminUser(authHeader);

    const isLocal = process.env.NODE_ENV !== 'production' && !process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!isAdmin && !isLocal) {
      return NextResponse.json({ error: 'غير مصرح لك بالوصول (يجب أن تكون مديراً)' }, { status: 403 });
    }

    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      console.warn('GitHub dispatch credentials not configured. Conversion will remain pending.');
      return NextResponse.json({
        warning: 'GitHub Dispatch token not configured in environment variables. Conversion must be triggered manually.',
        fileId,
      });
    }

    // Trigger GitHub Actions workflow_dispatch: audio-conversion.yml
    const ghEndpoint = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/audio-conversion.yml/dispatches`;

    const ghRes = await fetch(ghEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Tilawat-Admin-Web',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          file_id: fileId,
        },
      }),
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      console.error('GitHub API error:', ghRes.status, errText);
      return NextResponse.json({ error: `GitHub API error: ${ghRes.status} ${errText}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'تم إطلاق سير عمل التحويل بنجاح في GitHub Actions.',
      fileId,
    });
  } catch (err: any) {
    console.error('Trigger pipeline error:', err);
    return NextResponse.json({ error: err.message || 'Failed to trigger workflow' }, { status: 500 });
  }
}
