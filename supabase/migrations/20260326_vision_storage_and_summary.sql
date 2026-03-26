-- ============================================================
-- Vision Storage & Arabic Summary — Schema Update
-- ============================================================

-- 1. Add analysis_summary_ar column for Arabic scientific explanation
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS analysis_summary_ar TEXT;

-- 2. Create storage buckets for vision and video uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('vision-analyze', 'vision-analyze', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('video-analyze', 'video-analyze', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies for vision-analyze bucket
CREATE POLICY "Allow public read vision-analyze"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vision-analyze');

CREATE POLICY "Allow authenticated upload vision-analyze"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vision-analyze');

CREATE POLICY "Allow service role upload vision-analyze"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vision-analyze' AND auth.role() = 'service_role');

-- 4. Storage RLS policies for video-analyze bucket
CREATE POLICY "Allow public read video-analyze"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'video-analyze');

CREATE POLICY "Allow authenticated upload video-analyze"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'video-analyze');

CREATE POLICY "Allow service role upload video-analyze"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'video-analyze' AND auth.role() = 'service_role');

-- 5. Allow service role to bypass RLS on analyses table for edge function upserts
CREATE POLICY "Service role full access"
  ON public.analyses FOR ALL
  USING (auth.role() = 'service_role');
