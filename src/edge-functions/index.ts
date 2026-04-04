import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import vision analysis functions
import { visionAnalyzeHandler } from './vision-analyze.ts';
import { visionAnalyzeFastHandler } from './vision-analyze-fast.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET, HEAD, PUT",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

// Main edge function handler
async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Route to vision analysis
  if (req.url.includes('/vision-analyze')) {
    return visionAnalyzeHandler(req);
  }

  // Route to fast vision analysis
  if (req.url.includes('/vision-analyze-fast')) {
    return visionAnalyzeFastHandler(req);
  }

  // Health check endpoint
  if (req.url.includes('/health')) {
    return new Response(
      JSON.stringify({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        version: "2.0.0-gemini",
        api: "Google Gemini 2.0 Flash"
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }

  // Default response
  return new Response(
    JSON.stringify({ 
      error: "Endpoint not found. Available endpoints: /vision-analyze, /vision-analyze-fast, /health" 
    }), 
    { 
      status: 404, 
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json" 
      } 
    }
  );
}

// Export the handler for Supabase
export default {
  fetch: handler,
};

// Also serve directly for local testing
if (import.meta.main) {
  await serve(handler, { port: 8000 });
  console.log("🚀 APAS Vision Analysis Edge Function running on http://localhost:8000");
  console.log("📊 Available endpoints:");
  console.log("   POST /vision-analyze - Analyze projectile motion from images");
  console.log("   GET  /health - Health check");
}
