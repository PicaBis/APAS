import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import vision analysis function
import { visionAnalyzeHandler } from './vision-analyze.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      error: "Endpoint not found. Available endpoints: /vision-analyze, /health" 
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
