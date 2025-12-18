-- Brands table

CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY,
  owner_user_id uuid REFERENCES public.users (id),
  name text,
  category text,
  voice_guidelines text,
  brand_colors json,
  created_at timestamp NOT NULL
);

-- Indexes

CREATE INDEX IF NOT EXISTS brands_owner_user_id_idx ON public.brands (owner_user_id);

-- Optional down migration
-- DROP INDEX IF EXISTS public.brands_owner_user_id_idx;
-- DROP TABLE IF EXISTS public.brands;


