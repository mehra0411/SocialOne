-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reel_generation_method') THEN
    CREATE TYPE public.reel_generation_method AS ENUM ('ai', 'fallback');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reel_status') THEN
    CREATE TYPE public.reel_status AS ENUM ('draft', 'generating', 'ready', 'published', 'failed');
  END IF;
END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.reels (
  id uuid PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  video_url text,
  generation_method public.reel_generation_method NOT NULL,
  status public.reel_status NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_reels_brand_id
ON public.reels (brand_id);
