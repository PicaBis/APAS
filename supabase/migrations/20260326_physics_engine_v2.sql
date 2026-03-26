-- ============================================================
-- Physics Engine V2 — Supabase Schema
-- ============================================================

-- 1. Create analyses table for raw physics data
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Sequential educational ID for exercise notebook reference
  sequence_number SERIAL,
  
  -- Source info
  source_type TEXT NOT NULL CHECK (source_type IN ('video', 'image', 'exercise', 'audio')),
  source_url TEXT,
  source_filename TEXT,
  source_size_bytes BIGINT,
  
  -- Raw trajectory data from computer vision
  trajectory_points JSONB DEFAULT '[]'::jsonb,
  frame_width INTEGER,
  frame_height INTEGER,
  fps REAL,
  total_frames INTEGER,
  
  -- Computed physics values
  initial_velocity REAL,
  launch_angle REAL,
  launch_height REAL,
  max_altitude REAL,
  horizontal_range REAL,
  time_of_flight REAL,
  impact_velocity REAL,
  
  -- Velocity components
  v0x REAL,
  v0y REAL,
  
  -- Object info
  object_type TEXT,
  estimated_mass REAL,
  drag_effect TEXT CHECK (drag_effect IN ('none', 'slight', 'significant')),
  motion_type TEXT CHECK (motion_type IN ('vertical', 'horizontal', 'projectile')),
  
  -- Analysis quality
  confidence_score REAL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  analysis_method TEXT NOT NULL CHECK (analysis_method IN ('calculated', 'estimated', 'hybrid')),
  analysis_engine TEXT, -- e.g. 'physics_engine_parabolic_fit', 'gemini_vision', 'mistral_math'
  
  -- Parabolic fit data
  parabolic_coefficients JSONB, -- {coeffs_x: [...], coeffs_y: [...], r_squared: ...}
  
  -- Calibration
  calibration_source TEXT, -- 'user', 'auto', 'default'
  calibration_meters_per_pixel REAL,
  calibration_reference TEXT, -- description of reference object
  
  -- Gravity used
  gravity REAL DEFAULT 9.81,
  environment TEXT DEFAULT 'earth',
  
  -- Full AI report text
  report_text TEXT,
  report_lang TEXT CHECK (report_lang IN ('ar', 'en')),
  
  -- Provider info
  ai_provider TEXT, -- 'Gemini', 'Mistral', 'Groq'
  processing_time_ms INTEGER,
  
  -- Tags
  tags TEXT[] DEFAULT '{}'
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_source_type ON public.analyses(source_type);
CREATE INDEX IF NOT EXISTS idx_analyses_sequence ON public.analyses(sequence_number);

-- 3. Enable Row Level Security
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can only see their own analyses
CREATE POLICY "Users can view own analyses"
  ON public.analyses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own analyses
CREATE POLICY "Users can insert own analyses"
  ON public.analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own analyses
CREATE POLICY "Users can update own analyses"
  ON public.analyses FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "Users can delete own analyses"
  ON public.analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Allow anonymous access for non-authenticated usage (public app)
CREATE POLICY "Allow anonymous read access"
  ON public.analyses FOR SELECT
  USING (user_id IS NULL);

CREATE POLICY "Allow anonymous insert"
  ON public.analyses FOR INSERT
  WITH CHECK (user_id IS NULL);
