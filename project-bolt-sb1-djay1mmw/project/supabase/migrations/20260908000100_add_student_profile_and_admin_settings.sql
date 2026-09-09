-- Add fields introduced after the initial CampusLink schema.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS graduation_year integer;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS github_url text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS resume_url text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS resume_text text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email_verification_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  college_name text DEFAULT 'CampusLink College',
  placement_cell_email text,
  sender_name text DEFAULT 'CampusLink Placement Cell',
  default_email_footer text DEFAULT 'This email was sent by the CampusLink Placement Cell.',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.admin_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_admin_settings" ON public.admin_settings;
CREATE POLICY "auth_select_admin_settings" ON public.admin_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_admin_settings" ON public.admin_settings;
CREATE POLICY "auth_insert_admin_settings" ON public.admin_settings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_admin_settings" ON public.admin_settings;
CREATE POLICY "auth_update_admin_settings" ON public.admin_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
