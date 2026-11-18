import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, BUCKET_NAME } from '@/lib/s3Client';
import { verifyAdminUser } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const isAdmin = await verifyAdminUser(authHeader);

    // In local development or demo mode, allow fallback
    const isLocal = process.env.NODE_ENV !== 'production' && !process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!isAdmin && !isLocal) {
      return NextResponse.json({ error: 'غير مصرح لك بالوصول (يجب أن تكون مديراً)' }, { status: 403 });
    }

    const { fileId, filename, contentType } = await req.json();

    if (!fileId || !filename) {
      return NextResponse.json({ error: 'fileId and filename are required' }, { status: 400 });
    }

    const ext = filename.split('.').pop() || 'tmp';
    const objectKey = `incoming/${fileId}/original.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      ContentType: contentType || 'application/octet-stream',
    });

    // Generate presigned PUT URL valid for 2 hours (enough for large mobile uploads)
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 7200 });

    return NextResponse.json({
      presignedUrl,
      objectKey,
    });
  } catch (err: any) {
    console.error('Presign error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate upload URL' }, { status: 500 });
  }
}
