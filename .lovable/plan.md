

# Switching APAS Physics Tutor to Direct Gemini API

## Summary
Replace the current Lovable AI gateway integration with a direct call to Google Gemini API using the provided API key. The chat bubble and streaming behavior will remain the same, but the backend will call Google's API directly, avoiding any platform credit usage.

## Changes

### 1. Update Edge Function (`supabase/functions/physics-tutor/index.ts`)
- Replace the Lovable AI gateway URL with Google Gemini's `generateContent` streaming endpoint:
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=...`
- The Google API key is a publishable key -- it will be hardcoded in the edge function (server-side only, not exposed to the client).
- Adapt the request/response format from OpenAI-compatible to Gemini's native format:
  - Gemini uses `contents` array with `parts` instead of `messages` with `content`
  - System instructions go in a separate `systemInstruction` field
  - Streaming SSE chunks have a different JSON shape (`candidates[0].content.parts[0].text`)
- Transform the Gemini SSE stream into OpenAI-compatible SSE format before returning to the client, so the frontend code needs zero changes.
- Keep the existing system prompt (physics tutor persona, bilingual, simulation context).
- Maintain all error handling (return clear error messages on failure).

### 2. Update `supabase/config.toml`
- Add the `physics-tutor` function entry with `verify_jwt = false` so the function can be called without authentication (fixing a pending issue from the plan).

### 3. No Frontend Changes Needed
- The edge function will output the same OpenAI-compatible SSE format, so `PhysicsTutor.tsx` continues working as-is.
- Error handling, markdown rendering, and RTL support all stay the same.

---

## Technical Details

**Gemini API request format:**
```text
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=API_KEY

{
  "systemInstruction": { "parts": [{ "text": "..." }] },
  "contents": [
    { "role": "user", "parts": [{ "text": "..." }] },
    { "role": "model", "parts": [{ "text": "..." }] }
  ]
}
```

**Stream transformation logic (in the edge function):**
- Read each SSE line from Gemini
- Extract `candidates[0].content.parts[0].text`
- Re-emit as `data: {"choices":[{"delta":{"content":"..."}}]}`
- Emit `data: [DONE]` at the end

This keeps the frontend completely unchanged while switching the backend provider.

