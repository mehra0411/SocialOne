-- Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'instagram_account_status') THEN
    CREATE TYPE public.instagram_account_status AS ENUM ('connected', 'expired');
  END IF;
END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id uuid PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  instagram_user_id text,
  page_id text,
  access_token_encrypted text,
  status public.instagram_account_status NOT NULL DEFAULT 'connected',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_brand_id
ON public.instagram_accounts (brand_id);
