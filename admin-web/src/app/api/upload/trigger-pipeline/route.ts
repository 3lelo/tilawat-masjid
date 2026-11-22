import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminUser } from '@/lib/supabaseServer';

const GITHUB_TOKEN = process.env.GITHUB_DISPATCH_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_REPO_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO_NAME;

export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();
  try {
    const authHeader = req.headers.get('Authorization');
    const isAdmin = await verifyAdminUser(authHeader);

    const isLocal = process.env.NODE_ENV !== 'production' && !process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!isAdmin && !isLocal) {
      console.warn(`[Pipeline ${timestamp}] Unauthorized trigger attempt.`);
      return NextResponse.json({
        error: 'غير مصرح لك بالوصول (يجب أن تكون مديراً)',
        diagnostics: { timestamp, reason: 'auth_failed' }
      }, { status: 403 });
    }

    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const diagnostics = {
      timestamp,
      fileId,
      hasToken: Boolean(GITHUB_TOKEN),
      tokenPrefix: GITHUB_TOKEN ? GITHUB_TOKEN.substring(0, 4) + '...' : 'missing',
      owner: GITHUB_OWNER || 'missing',
      repo: GITHUB_REPO || 'missing',
    };

    console.log(`[Pipeline ${timestamp}] Triggering conversion for ${fileId}:`, diagnostics);

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      const msg = `GitHub credentials incomplete. Token: ${Boolean(GITHUB_TOKEN)}, Owner: ${GITHUB_OWNER || 'missing'}, Repo: ${GITHUB_REPO || 'missing'}`;
      console.warn(`[Pipeline ${timestamp}] ${msg}`);
      return NextResponse.json({
        warning: 'بيانات GitHub Dispatch غير مكتملة في متغيرات البيئة. يرجى ضبط GITHUB_DISPATCH_TOKEN و GITHUB_REPO_OWNER و GITHUB_REPO_NAME في لوحة تحكم Vercel.',
        diagnostics,
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
      console.error(`[Pipeline ${timestamp}] GitHub API dispatch failed:`, ghRes.status, errText);
      return NextResponse.json({
        error: `GitHub API error (${ghRes.status}): ${errText}`,
        diagnostics: {
          ...diagnostics,
          ghStatus: ghRes.status,
          ghEndpoint,
          rawError: errText,
        }
      }, { status: 500 });
    }

    console.log(`[Pipeline ${timestamp}] Successfully dispatched workflow for ${fileId}.`);
    return NextResponse.json({
      success: true,
      message: 'تم إطلاق سير عمل التحويل بنجاح في GitHub Actions.',
      diagnostics: {
        ...diagnostics,
        ghStatus: ghRes.status,
      },
      fileId,
    });
  } catch (err: any) {
    console.error(`[Pipeline ${timestamp}] Unexpected trigger pipeline error:`, err);
    return NextResponse.json({
      error: err.message || 'Failed to trigger workflow',
      diagnostics: {
        timestamp,
        errorName: err.name,
        stack: err.stack,
      }
    }, { status: 500 });
  }
}
