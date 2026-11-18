import { NextRequest, NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
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

    // 1. Fetch file record to obtain R2 URL
    const { data: fileRecord, error: fetchErr } = await supabaseAdmin
      .from('audio_files')
      .select('audio_url')
      .eq('id', id)
      .single();

    // 2. Delete object from Cloudflare R2
    try {
      const finalKey = `audio/${id}.m4a`;
      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: finalKey,
        })
      );
    } catch (s3Err) {
      console.warn('R2 deletion warning:', s3Err);
    }

    // 3. Delete database row
    const { error: delErr } = await supabaseAdmin
      .from('audio_files')
      .delete()
      .eq('id', id);

    if (delErr) {
      throw delErr;
    }

    return NextResponse.json({ success: true, message: 'تم حذف التسجيل والملف الصوتي بنجاح.' });
  } catch (err: any) {
    console.error('Delete audio error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete audio file' }, { status: 500 });
  }
}
