-- Enum types

DO $$

BEGIN

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN

    CREATE TYPE public.user_role AS ENUM ('user', 'super_admin');

  END IF;



  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN

    CREATE TYPE public.account_status AS ENUM ('active', 'paused', 'restricted', 'suspended');

  END IF;

END $$;



-- Users table

CREATE TABLE IF NOT EXISTS public.users (

  id uuid PRIMARY KEY,

  email text NOT NULL,

  role public.user_role NOT NULL DEFAULT 'user',

  account_status public.account_status NOT NULL DEFAULT 'active',

  created_at timestamp with time zone NOT NULL DEFAULT now()

);



-- Optional down migration

-- DROP TABLE IF EXISTS public.users;

-- DROP TYPE IF EXISTS public.account_status;

-- DROP TYPE IF EXISTS public.user_role;


