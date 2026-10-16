import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Resume upload function is missing Supabase server configuration.');
    return jsonResponse({ error: 'Resume upload is not configured on the server.' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let uploadedPath: string | null = null;
  try {
    const form = await request.formData();
    const token = form.get('token');
    const payloadValue = form.get('payload');
    const resume = form.get('resume');
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)
      || typeof payloadValue !== 'string'
      || !(resume instanceof File)) {
      return jsonResponse({ error: 'Registration details and a PDF resume are required.' }, 400);
    }
    if (resume.size === 0 || resume.size > 5 * 1024 * 1024) {
      return jsonResponse({ error: 'Resume PDF must be between 1 byte and 5 MB.' }, 400);
    }
    if (resume.type !== 'application/pdf') {
      return jsonResponse({ error: 'Upload the resume as a PDF file.' }, 415);
    }

    const { data: qrType, error: qrError } = await supabase.rpc('get_registration_qr_type', { p_token: token });
    if (qrError) throw qrError;
    if (qrType !== 'student') return jsonResponse({ error: 'This student registration QR is invalid or revoked.' }, 400);

    let payload: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(payloadValue);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid object');
      payload = parsed as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: 'Invalid student registration details.' }, 400);
    }

    const bytes = new Uint8Array(await resume.arrayBuffer());
    const pdfHeader = new TextDecoder().decode(bytes.slice(0, 5));
    if (pdfHeader !== '%PDF-') return jsonResponse({ error: 'The uploaded file is not a valid PDF.' }, 415);

    uploadedPath = `${token}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('student-resumes')
      .upload(uploadedPath, bytes, { contentType: 'application/pdf', upsert: false });
    if (uploadError) throw uploadError;

    const { data: studentId, error: submitError } = await supabase.rpc('submit_registration_qr', {
      p_token: token,
      p_payload: { ...payload, resume_url: uploadedPath },
    });
    if (submitError) throw submitError;

    return jsonResponse({ studentId }, 201);
  } catch (error) {
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage.from('student-resumes').remove([uploadedPath]);
      if (cleanupError) console.error('Failed to remove unlinked resume upload:', cleanupError.message);
    }
    console.error('Student QR resume submission failed:', error instanceof Error ? error.message : error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Student registration failed.' }, 400);
  }
});
