#!/usr/bin/env node

/**
 * Audio / Video Conversion Pipeline Script
 * Invoked by GitHub Actions via `workflow_dispatch`
 *
 * 1. Downloads original file from Cloudflare R2 (incoming/<file_id>/)
 * 2. Runs ffprobe to check streams (drops video if present)
 * 3. Transcodes to speech-optimized audio:
 *    Mono, AAC (.m4a), ~48 kbps, 24 kHz, loudness normalization
 * 4. Uploads result to audio/<file_id>.m4a on R2
 * 5. Deletes original from incoming/
 * 6. Updates Supabase audio_files table with status = 'ready', duration, size
 */

import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { createWriteStream, createReadStream, statSync, unlinkSync, existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';

const fileId = process.env.FILE_ID || process.argv[2];

if (!fileId) {
  console.error('Error: FILE_ID is required.');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tilawat-audio';
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing Cloudflare R2 credentials.');
  process.exit(1);
}

// Initialize Supabase admin client with service_role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Initialize S3/R2 client
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const tempDir = process.env.RUNNER_TEMP || '/tmp';
let inputFilePath = '';
let outputFilePath = path.join(tempDir, `converted_${fileId}.m4a`);

async function run() {
  console.log(`[Pipeline] Starting conversion for file ID: ${fileId}`);

  try {
    // 1. Locate incoming file in R2 under `incoming/<fileId>/`
    const listRes = await s3.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: `incoming/${fileId}/`,
        MaxKeys: 1,
      })
    );

    if (!listRes.Contents || listRes.Contents.length === 0) {
      throw new Error(`Original file not found under incoming/${fileId}/ on R2.`);
    }

    const incomingKey = listRes.Contents[0].Key;
    const incomingExt = path.extname(incomingKey) || '.tmp';
    inputFilePath = path.join(tempDir, `raw_${fileId}${incomingExt}`);

    console.log(`[Pipeline] Downloading original: ${incomingKey} -> ${inputFilePath}`);

    // Stream download original file to disk to handle multi-GB files without memory overflow
    const getRes = await s3.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: incomingKey,
      })
    );

    await pipeline(getRes.Body, createWriteStream(inputFilePath));
    const inputSize = statSync(inputFilePath).size;
    console.log(`[Pipeline] Downloaded ${inputSize} bytes.`);

    // 2. Probe streams with ffprobe
    console.log(`[Pipeline] Probing media streams with ffprobe...`);
    const probeJson = execSync(
      `ffprobe -v quiet -print_format json -show_streams -show_format "${inputFilePath}"`
    ).toString();
    const probeData = JSON.parse(probeJson);

    const hasAudio = probeData.streams?.some((s) => s.codec_type === 'audio');
    const hasVideo = probeData.streams?.some((s) => s.codec_type === 'video');

    if (!hasAudio) {
      throw new Error('Uploaded file does not contain any audio stream.');
    }

    console.log(`[Pipeline] Detected streams: Audio: ${hasAudio}, Video: ${hasVideo}`);

    // 3. Transcode using ffmpeg:
    // -vn: drop video
    // -c:a aac: high-compatibility AAC
    // -b:a 48k: speech-optimized bitrate (~20-25 MB per hour)
    // -ac 1: mono
    // -ar 24000: 24 kHz speech sampling rate
    // -af "loudnorm=I=-16:TP=-1.5:LRA=11": light audio broadcast loudness normalization
    console.log(`[Pipeline] Transcoding audio with ffmpeg...`);
    const ffmpegCmd = `ffmpeg -y -i "${inputFilePath}" -vn -c:a aac -b:a 48k -ac 1 -ar 24000 -af "loudnorm=I=-16:TP=-1.5:LRA=11" "${outputFilePath}"`;
    execSync(ffmpegCmd, { stdio: 'inherit' });

    // 4. Measure duration and size of final file
    const outputStat = statSync(outputFilePath);
    const outputSize = outputStat.size;

    const outProbeJson = execSync(
      `ffprobe -v quiet -print_format json -show_format "${outputFilePath}"`
    ).toString();
    const outProbe = JSON.parse(outProbeJson);
    const durationSeconds = Math.round(parseFloat(outProbe.format?.duration || '0'));

    console.log(`[Pipeline] Output ready: ${outputSize} bytes, duration: ${durationSeconds} seconds.`);

    // 5. Upload final .m4a file to R2 under `audio/<fileId>.m4a`
    const finalKey = `audio/${fileId}.m4a`;
    console.log(`[Pipeline] Uploading compressed audio to ${finalKey}...`);

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: finalKey,
        Body: createReadStream(outputFilePath),
        ContentType: 'audio/mp4',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    // 6. Delete original file from `incoming/`
    console.log(`[Pipeline] Deleting incoming original: ${incomingKey}...`);
    await s3.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: incomingKey,
      })
    );

    // 7. Update Supabase audio_files table
    const finalAudioUrl = `${R2_PUBLIC_URL}/${finalKey}`;
    console.log(`[Pipeline] Updating database row status to 'ready'...`);

    const { error: dbError } = await supabase
      .from('audio_files')
      .update({
        audio_url: finalAudioUrl,
        duration_seconds: durationSeconds,
        size_bytes: outputSize,
        status: 'ready',
        error_message: null,
      })
      .eq('id', fileId);

    if (dbError) {
      throw dbError;
    }

    console.log(`[Pipeline] File conversion completed successfully! Ready URL: ${finalAudioUrl}`);
  } catch (err) {
    console.error(`[Pipeline Error]:`, err);

    // Mark as failed in database
    await supabase
      .from('audio_files')
      .update({
        status: 'failed',
        error_message: err.message || 'Unknown conversion error',
      })
      .eq('id', fileId);

    process.exit(1);
  } finally {
    // Cleanup temporary files on disk
    try {
      if (inputFilePath && existsSync(inputFilePath)) unlinkSync(inputFilePath);
      if (outputFilePath && existsSync(outputFilePath)) unlinkSync(outputFilePath);
    } catch {}
  }
}

run();
