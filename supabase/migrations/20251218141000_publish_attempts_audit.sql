CREATE TABLE IF NOT EXISTS public.publish_attempts (
  post_id uuid NOT NULL,
  post_type text NOT NULL,
  platform text NOT NULL,
  trigger_type text NOT NULL,
  attempt_number integer NOT NULL,
  status text NOT NULL,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);


