CREATE TABLE IF NOT EXISTS public.registration_qr_links (
  token text PRIMARY KEY,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('student', 'recruiter')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_qr_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registration_qr_links FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_registration_qr(p_entity_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_entity_type NOT IN ('student', 'recruiter') THEN
    RAISE EXCEPTION 'Invalid registration type';
  END IF;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  INSERT INTO public.registration_qr_links (token, admin_user_id, entity_type)
  VALUES (v_token, auth.uid(), p_entity_type);
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_registration_qr_type(p_token text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT entity_type
  FROM public.registration_qr_links
  WHERE token = p_token
    AND active
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_registration_qr(p_token text, p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_link public.registration_qr_links%ROWTYPE;
  v_record_id uuid;
  v_name text := nullif(btrim(p_payload ->> 'name'), '');
  v_email text := lower(nullif(btrim(p_payload ->> 'email'), ''));
BEGIN
  SELECT *
  INTO v_link
  FROM public.registration_qr_links
  WHERE token = p_token
    AND active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This registration QR is invalid or has been revoked';
  END IF;
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid registration details';
  END IF;
  IF (SELECT count(*) FROM pg_catalog.jsonb_object_keys(p_payload)) > 6 THEN
    RAISE EXCEPTION 'Too many registration fields';
  END IF;
  IF v_name IS NULL OR length(v_name) > 200 THEN
    RAISE EXCEPTION 'Enter a valid name';
  END IF;
  IF v_email IS NULL OR length(v_email) > 320 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;

  IF v_link.entity_type = 'student' THEN
    IF length(coalesce(p_payload ->> 'roll_number', '')) > 100
      OR length(coalesce(p_payload ->> 'branch', '')) > 150
      OR length(coalesce(p_payload ->> 'phone', '')) > 50 THEN
      RAISE EXCEPTION 'One or more student details are too long';
    END IF;
    IF nullif(btrim(p_payload ->> 'graduation_year'), '') IS NOT NULL THEN
      IF (p_payload ->> 'graduation_year') !~ '^\d{4}$' THEN
        RAISE EXCEPTION 'Enter a valid graduation year';
      END IF;
      IF (p_payload ->> 'graduation_year')::integer NOT BETWEEN 1900 AND 2200 THEN
        RAISE EXCEPTION 'Enter a valid graduation year';
      END IF;
    END IF;

    INSERT INTO public.students (
      admin_user_id, name, email, roll_number, branch, phone, graduation_year
    )
    VALUES (
      v_link.admin_user_id,
      v_name,
      v_email,
      nullif(btrim(p_payload ->> 'roll_number'), ''),
      nullif(btrim(p_payload ->> 'branch'), ''),
      nullif(btrim(p_payload ->> 'phone'), ''),
      nullif(btrim(p_payload ->> 'graduation_year'), '')::integer
    )
    RETURNING id INTO v_record_id;
  ELSE
    IF length(coalesce(p_payload ->> 'industry', '')) > 150
      OR length(coalesce(p_payload ->> 'website', '')) > 2048
      OR length(coalesce(p_payload ->> 'contact_phone', '')) > 50
      OR length(coalesce(p_payload ->> 'description', '')) > 2000 THEN
      RAISE EXCEPTION 'One or more recruiter details are too long';
    END IF;

    INSERT INTO public.companies (
      admin_user_id, name, industry, website, contact_email, contact_phone, description
    )
    VALUES (
      v_link.admin_user_id,
      v_name,
      nullif(btrim(p_payload ->> 'industry'), ''),
      nullif(btrim(p_payload ->> 'website'), ''),
      v_email,
      nullif(btrim(p_payload ->> 'contact_phone'), ''),
      nullif(btrim(p_payload ->> 'description'), '')
    )
    RETURNING id INTO v_record_id;
  END IF;

  RETURN v_record_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_registration_qr(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.registration_qr_links
  SET active = false
  WHERE token = p_token
    AND admin_user_id = auth.uid()
    AND active;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.create_registration_qr(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_registration_qr_type(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_registration_qr(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_registration_qr(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_registration_qr(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_registration_qr_type(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_registration_qr(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_registration_qr(text) TO authenticated;
