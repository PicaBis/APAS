import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Vercel Serverless Function for video upload to Vercel Blob.
 * POST /api/videos/upload
 * 
 * Accepts multipart form data with a video file.
 * Returns the blob URL for the uploaded video.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
    if (!allowedTypes.some(t => file.type.startsWith('video/'))) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Only video files are allowed.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upload to Vercel Blob
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const pathname = `videos/${timestamp}-${safeName}`;

    const blob = await put(pathname, file, {
      access: 'public',
      multipart: file.size > 100 * 1024 * 1024, // Use multipart for files > 100MB
    });

    return new Response(JSON.stringify({
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({
      error: 'Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
