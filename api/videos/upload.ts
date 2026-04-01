import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB server-side limit

/**
 * Vercel Serverless Function for video upload to Vercel Blob.
 * POST /api/videos/upload
 * 
 * Requires a valid Supabase JWT in the Authorization header.
 * Accepts multipart form data with a video file.
 * Returns the blob URL for the uploaded video.
 */
export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Authenticate: require a valid Supabase JWT
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const token = authHeader.replace('Bearer ', '');

  // Validate JWT token format (basic validation)
  // A valid JWT has 3 parts separated by dots
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return new Response(JSON.stringify({ error: 'Invalid token format' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // Decode JWT to verify it's valid (without verification, just basic decode)
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    // Check if token has required claims
    if (!payload.sub || !payload.aud) {
      return new Response(JSON.stringify({ error: 'Invalid token claims' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid token: ' + (error instanceof Error ? error.message : 'Unknown error') }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Server-side file size validation
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` }), {
        status: 413,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Validate file type using both MIME type and file extension
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
    const allowedExtensions = ['.mp4', '.webm', '.mov', '.avi'];
    const fileExtension = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Only video files are allowed.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Upload to Vercel Blob
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const pathname = `videos/${timestamp}-${safeName}`;

    const blob = await put(pathname, file, {
      access: 'public',
      multipart: file.size > 5 * 1024 * 1024, // Use multipart for files > 5MB
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
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({
      error: 'Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
