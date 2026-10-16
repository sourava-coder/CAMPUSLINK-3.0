DO $migration$
DECLARE
  v_definition text;
BEGIN
  v_definition := pg_catalog.pg_get_functiondef(
    'public.submit_registration_qr(text,jsonb)'::regprocedure
  );

  IF pg_catalog.strpos(v_definition, 'jsonb_object_length(p_payload)') = 0 THEN
    RETURN;
  END IF;

  v_definition := pg_catalog.replace(
    v_definition,
    'jsonb_object_length(p_payload)',
    '(SELECT count(*) FROM pg_catalog.jsonb_object_keys(p_payload))'
  );
  EXECUTE v_definition;
END;
$migration$;

NOTIFY pgrst, 'reload schema';
