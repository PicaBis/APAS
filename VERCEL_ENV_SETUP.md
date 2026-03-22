# Vercel Environment Variables Configuration

To deploy your APAS application with working AI functionality on Vercel, you need to configure the following environment variables in your Vercel project settings.

## Required Environment Variables

### 1. GEMINI_API_KEY
- **Value**: `AIzaSyANSbUYsioBBFFMTi71mvhSmdqXHFaYdak`
- **Purpose**: Gemini API key for AI chat, recommendations, and image analysis
- **Where to add**: Vercel Dashboard → Project Settings → Environment Variables

### 2. Supabase Variables (already configured)
- `VITE_SUPABASE_PROJECT_ID=mllcegelhzcpjalweadq`
- `VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sbGNlZ2VsaHpjcGphbHdlYWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDk5OTIsImV4cCI6MjA4ODMyNTk5Mn0.x8hDocxPlLZSrcL1k4EsZDUg-YXC2XIQ2O9XSf7E_l0`
- `VITE_SUPABASE_URL=https://mllcegelhzcpjalweadq.supabase.co`

### 3. Additional Variables (optional)
- `VITE_ADMIN_EMAILS=medjahed8abdelhadi@gmail.com,medjahed9abdelhadi@gmail.com,medjahed10abdelhadi@gmail.com`
- `VITE_DEV_CODE_HASH=dv_k1y9k`

## Steps to Configure on Vercel

1. **Go to Vercel Dashboard**
   - Navigate to your APAS project
   - Go to **Settings** → **Environment Variables**

2. **Add GEMINI_API_KEY**
   - Click **Add New**
   - Name: `GEMINI_API_KEY`
   - Value: `AIzaSyANSbUYsioBBFFMTi71mvhSmdqXHFaYdak`
   - Environment: **Production**, **Preview**, **Development** (select all)
   - Click **Save**

3. **Redeploy Your Application**
   - After adding environment variables, trigger a new deployment
   - Either push a new commit or use **Redeploy** in Vercel dashboard

4. **Verify Configuration**
   - Check deployment logs for any errors related to missing API keys
   - Test AI functionality in the deployed application

## Edge Functions Configuration

The following edge functions now use Gemini API:
- `physics-tutor` - AI chat assistant
- `vision-analyze` - Image analysis

Make sure your Supabase project also has the `GEMINI_API_KEY` environment variable set for edge functions to work properly.

## Troubleshooting

### AI Features Not Working
1. Verify `GEMINI_API_KEY` is set in Vercel environment variables
2. Check that the key value matches exactly (no extra spaces)
3. Ensure edge functions are deployed and accessible
4. Check browser console for API error messages

### Rate Limit Issues
If you encounter rate limiting:
- The application automatically falls back between Gemini 2.0 Flash and 1.5 Flash
- Consider upgrading your Gemini API quota if needed

### Deployment Errors
- Check that all environment variables are properly set
- Verify the Supabase edge functions are deployed
- Check Vercel function logs for detailed error messages

## Local Development

For local development, ensure your `.env` file contains:
```
VITE_GEMINI_API_KEY=AIzaSyANSbUYsioBBFFMTi71mvhSmdqXHFaYdak
```

This will make the AI features work when running `npm run dev`.
