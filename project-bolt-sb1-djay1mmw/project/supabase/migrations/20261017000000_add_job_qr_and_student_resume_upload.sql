ALTER TABLE public.registration_qr_links
  DROP CONSTRAINT IF EXISTS registration_qr_links_entity_type_check;

ALTER TABLE public.registration_qr_links
  ADD CONSTRAINT registration_qr_links_entity_type_check
  CHECK (entity_type IN ('student', 'recruiter', 'job'));

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS portfolio_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('student-resumes', 'student-resumes', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf'];

CREATE OR REPLACE FUNCTION public.can_read_student_resume(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registration_qr_links qr
    JOIN public.students s ON s.admin_user_id = qr.admin_user_id
    WHERE qr.token = split_part(p_object_name, '/', 1)
      AND qr.entity_type = 'student'
      AND qr.admin_user_id = auth.uid()
      AND s.resume_url = p_object_name
  );
$$;

REVOKE ALL ON FUNCTION public.can_read_student_resume(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_student_resume(text) TO authenticated;

DROP POLICY IF EXISTS "Admins can read their QR student resumes" ON storage.objects;
CREATE POLICY "Admins can read their QR student resumes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'student-resumes'
  AND public.can_read_student_resume(name)
);

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
  IF p_entity_type NOT IN ('student', 'recruiter', 'job') THEN
    RAISE EXCEPTION 'Invalid registration type';
  END IF;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  INSERT INTO public.registration_qr_links (token, admin_user_id, entity_type)
  VALUES (v_token, auth.uid(), p_entity_type);
  RETURN v_token;
END;
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
  v_company_id uuid;
  v_name text := nullif(btrim(p_payload ->> 'name'), '');
  v_email text := lower(nullif(btrim(p_payload ->> 'email'), ''));
  v_job_title text := nullif(btrim(p_payload ->> 'title'), '');
  v_deadline date;
BEGIN
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid registration details';
  END IF;

  SELECT *
  INTO v_link
  FROM public.registration_qr_links
  WHERE token = p_token
    AND active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This registration QR is invalid or has been revoked';
  END IF;

  IF v_link.entity_type = 'student' THEN
    IF (SELECT count(*) FROM pg_catalog.jsonb_object_keys(p_payload)) > 12 THEN
      RAISE EXCEPTION 'Too many student registration fields';
    END IF;
    IF v_name IS NULL OR length(v_name) > 200 THEN
      RAISE EXCEPTION 'Enter a valid name';
    END IF;
    IF v_email IS NULL OR length(v_email) > 320 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
      RAISE EXCEPTION 'Enter a valid email address';
    END IF;
    IF length(coalesce(p_payload ->> 'roll_number', '')) > 100
      OR length(coalesce(p_payload ->> 'branch', '')) > 150
      OR length(coalesce(p_payload ->> 'phone', '')) > 50 THEN
      RAISE EXCEPTION 'One or more student details are too long';
    END IF;
    IF nullif(btrim(p_payload ->> 'graduation_year'), '') IS NOT NULL THEN
      IF (p_payload ->> 'graduation_year') !~ '^\d{4}$'
        OR (p_payload ->> 'graduation_year')::integer NOT BETWEEN 1900 AND 2200 THEN
        RAISE EXCEPTION 'Enter a valid graduation year';
      END IF;
    END IF;
    IF length(coalesce(p_payload ->> 'linkedin_url', '')) > 2048
      OR length(coalesce(p_payload ->> 'github_url', '')) > 2048
      OR length(coalesce(p_payload ->> 'portfolio_url', '')) > 2048 THEN
      RAISE EXCEPTION 'One or more profile links are too long';
    END IF;
    IF coalesce(p_payload ->> 'resume_url', '') <> '' THEN
      IF p_payload ->> 'resume_url' !~ ('^' || p_token || '/[a-f0-9-]{36}\.pdf$') THEN
        RAISE EXCEPTION 'Invalid uploaded resume reference';
      END IF;
      IF NOT EXISTS (
        SELECT 1
        FROM storage.objects o
        WHERE o.bucket_id = 'student-resumes'
          AND o.name = p_payload ->> 'resume_url'
      ) THEN
        RAISE EXCEPTION 'Uploaded resume was not found';
      END IF;
    END IF;

    INSERT INTO public.students (
      admin_user_id, name, email, roll_number, branch, phone, graduation_year,
      linkedin_url, github_url, portfolio_url, resume_url
    )
    VALUES (
      v_link.admin_user_id,
      v_name,
      v_email,
      nullif(btrim(p_payload ->> 'roll_number'), ''),
      nullif(btrim(p_payload ->> 'branch'), ''),
      nullif(btrim(p_payload ->> 'phone'), ''),
      nullif(btrim(p_payload ->> 'graduation_year'), '')::integer,
      nullif(btrim(p_payload ->> 'linkedin_url'), ''),
      nullif(btrim(p_payload ->> 'github_url'), ''),
      nullif(btrim(p_payload ->> 'portfolio_url'), ''),
      nullif(btrim(p_payload ->> 'resume_url'), '')
    )
    RETURNING id INTO v_record_id;
  ELSIF v_link.entity_type = 'recruiter' THEN
    IF (SELECT count(*) FROM pg_catalog.jsonb_object_keys(p_payload)) > 6 THEN
      RAISE EXCEPTION 'Too many recruiter registration fields';
    END IF;
    IF v_name IS NULL OR length(v_name) > 200 THEN
      RAISE EXCEPTION 'Enter a valid company name';
    END IF;
    IF v_email IS NULL OR length(v_email) > 320 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
      RAISE EXCEPTION 'Enter a valid email address';
    END IF;
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
  ELSE
    IF (SELECT count(*) FROM pg_catalog.jsonb_object_keys(p_payload)) > 15 THEN
      RAISE EXCEPTION 'Too many job registration fields';
    END IF;
    IF v_name IS NULL OR length(v_name) > 200 OR v_job_title IS NULL OR length(v_job_title) > 200 THEN
      RAISE EXCEPTION 'Enter a valid company name and job title';
    END IF;
    IF v_email IS NULL OR length(v_email) > 320 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
      RAISE EXCEPTION 'Enter a valid company email address';
    END IF;
    IF length(coalesce(p_payload ->> 'industry', '')) > 150
      OR length(coalesce(p_payload ->> 'contact_phone', '')) > 50
      OR length(coalesce(p_payload ->> 'website', '')) > 2048
      OR length(coalesce(p_payload ->> 'description', '')) > 2000
      OR length(coalesce(p_payload ->> 'job_description', '')) > 10000
      OR length(coalesce(p_payload ->> 'location', '')) > 200 THEN
      RAISE EXCEPTION 'One or more job details are too long';
    END IF;
    IF coalesce(nullif(p_payload ->> 'min_cgpa', ''), '0') !~ '^\d{1,2}(\.\d{1,2})?$' THEN
      RAISE EXCEPTION 'Enter a valid minimum CGPA';
    END IF;
    IF coalesce(nullif(p_payload ->> 'min_cgpa', ''), '0')::numeric NOT BETWEEN 0 AND 10 THEN
      RAISE EXCEPTION 'Enter a valid minimum CGPA';
    END IF;
    IF coalesce(nullif(p_payload ->> 'package_lpa', ''), '0') !~ '^\d{1,4}(\.\d{1,2})?$' THEN
      RAISE EXCEPTION 'Enter a valid package';
    END IF;
    IF coalesce(nullif(p_payload ->> 'package_lpa', ''), '0')::numeric NOT BETWEEN 0 AND 1000 THEN
      RAISE EXCEPTION 'Enter a valid package';
    END IF;
    IF nullif(p_payload ->> 'deadline', '') IS NOT NULL THEN
      IF (p_payload ->> 'deadline') !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RAISE EXCEPTION 'Enter a valid deadline';
      END IF;
      BEGIN
        v_deadline := (p_payload ->> 'deadline')::date;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'Enter a valid deadline';
      END;
    END IF;
    IF length(coalesce(p_payload ->> 'required_skills', '')) > 2000
      OR length(coalesce(p_payload ->> 'preferred_skills', '')) > 2000 THEN
      RAISE EXCEPTION 'Skills list is too long';
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
    RETURNING id INTO v_company_id;

    INSERT INTO public.jobs (
      admin_user_id, company_id, title, description, required_skills,
      preferred_skills, min_cgpa, package_lpa, location, job_type, deadline, status
    )
    VALUES (
      v_link.admin_user_id,
      v_company_id,
      v_job_title,
      nullif(btrim(p_payload ->> 'job_description'), ''),
      coalesce(ARRAY(SELECT btrim(skill) FROM unnest(string_to_array(coalesce(p_payload ->> 'required_skills', ''), ',')) skill WHERE btrim(skill) <> ''), '{}'),
      coalesce(ARRAY(SELECT btrim(skill) FROM unnest(string_to_array(coalesce(p_payload ->> 'preferred_skills', ''), ',')) skill WHERE btrim(skill) <> ''), '{}'),
      coalesce(nullif(p_payload ->> 'min_cgpa', '')::numeric, 0),
      coalesce(nullif(p_payload ->> 'package_lpa', '')::numeric, 0),
      nullif(btrim(p_payload ->> 'location'), ''),
      CASE WHEN p_payload ->> 'job_type' IN ('full-time', 'internship', 'contract', 'part-time') THEN p_payload ->> 'job_type' ELSE 'full-time' END,
      v_deadline,
      'active'
    )
    RETURNING id INTO v_record_id;
  END IF;

  RETURN v_record_id;
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

REVOKE ALL ON FUNCTION public.create_registration_qr(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_registration_qr_type(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_registration_qr(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_registration_qr(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_registration_qr_type(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_registration_qr(text, jsonb) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
