import { NextRequest, NextResponse } from 'next/server';
import { DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3, BUCKET_NAME } from '@/lib/s3Client';
import { supabaseAdmin, verifyAdminUser } from '@/lib/supabaseServer';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('Authorization');
    const isAdmin = await verifyAdminUser(authHeader);

    const isLocal = process.env.NODE_ENV !== 'production' && !process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!isAdmin && !isLocal) {
      return NextResponse.json({ error: 'غير مصرح لك بالوصول (يجب أن تكون مديراً)' }, { status: 403 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // 1. Fetch file record to verify existence and check audio_url if available
    const { data: fileRecord } = await supabaseAdmin
      .from('audio_files')
      .select('audio_url, status')
      .eq('id', id)
      .maybeSingle();

    // 2. Comprehensive Cloudflare R2 cleanup:
    // A) Final transcoded file under `audio/${id}.m4a`
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `audio/${id}.m4a`,
        })
      );
    } catch (s3Err) {
      console.warn(`R2 final file cleanup note for ${id}:`, s3Err);
    }

    // B) If audio_url has custom key or alternate location, parse and delete it
    if (fileRecord?.audio_url) {
      try {
        const parsedUrl = new URL(fileRecord.audio_url);
        const customKey = parsedUrl.pathname.replace(/^\/+/, '');
        if (customKey && customKey !== `audio/${id}.m4a`) {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: customKey,
            })
          );
        }
      } catch {}
    }

    // C) Delete any incoming raw upload objects under `incoming/${id}/` (handles files still processing or aborted)
    try {
      const incomingList = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: `incoming/${id}/`,
        })
      );

      if (incomingList.Contents && incomingList.Contents.length > 0) {
        for (const item of incomingList.Contents) {
          if (item.Key) {
            await s3.send(
              new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: item.Key,
              })
            );
          }
        }
      }
    } catch (incomingErr) {
      console.warn(`R2 incoming cleanup note for ${id}:`, incomingErr);
    }

    // 3. Delete database row from audio_files
    const { error: delErr } = await supabaseAdmin
      .from('audio_files')
      .delete()
      .eq('id', id);

    if (delErr) {
      throw delErr;
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف التسجيل وتنظيف ملفات التخزين السحابي (R2) بنجاح.',
    });
  } catch (err: any) {
    console.error('Delete audio error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete audio file' }, { status: 500 });
  }
}
