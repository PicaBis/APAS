-- ============================================================
-- APAS Elite Analysis System — Final Schema Update
-- ============================================================

-- 1. Subject/Exercise specific columns
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS subject_data_ar TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS step_by_step_solution_ar TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS final_answer_ar TEXT;

-- 2. General metadata and storage
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS cloudinary_url TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'image'; -- 'image', 'video', 'subject'
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS analysis_metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Ensure proper RLS for all operations
CREATE POLICY "Public read analyses"
  ON public.analyses FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create analyses"
  ON public.analyses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Service role full access bypass"
  ON public.analyses FOR ALL
  USING (auth.role() = 'service_role');
