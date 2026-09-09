import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { to, subject, body, type, studentId } = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build a professional HTML email
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#0a0a0a;border:1px solid #facc15;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#facc15,#f59e0b);padding:24px 32px;">
      <h1 style="margin:0;color:#0a0a0a;font-size:24px;font-weight:800;letter-spacing:1px;">CAMPUSLINK</h1>
      <p style="margin:4px 0 0;color:#0a0a0a;font-size:13px;opacity:0.8;">AI-Powered Campus Placement Platform</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#facc15;margin:0 0 16px;font-size:20px;">${subject}</h2>
      <div style="color:#e5e5e5;font-size:15px;line-height:1.6;white-space:pre-wrap;">${body}</div>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #facc15;">
      <p style="margin:0;color:#a3a3a3;font-size:12px;text-align:center;">
        This email was sent from CampusLink Placement Platform.<br>
        &copy; 2026 CampusLink. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

    let providerConfigured = false;
    let providerError = "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("SENDER_EMAIL");
    if (resendApiKey && senderEmail) {
      providerConfigured = true;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: senderEmail, to: [to], subject, html: htmlBody, text: body }),
      });
      if (!response.ok) providerError = await response.text();
    }

    const smtpUrl = Deno.env.get("SMTP_URL");
    if (!providerConfigured && smtpUrl) {
      providerConfigured = true;
      try {
        const response = await fetch(smtpUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject, html: htmlBody, text: body }),
        });
        if (!response.ok) providerError = await response.text();
      } catch (smtpErr) {
        providerError = String(smtpErr);
      }
    }

    if (!providerConfigured) {
      return new Response(
        JSON.stringify({ error: "Email provider is not configured. Add RESEND_API_KEY and SENDER_EMAIL, or SMTP_URL, to the send-email Edge Function secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (providerError) {
      return new Response(
        JSON.stringify({ error: "Email provider rejected the message: " + providerError }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: emailLog, error: logError } = await supabase
      .from("emails")
      .insert({ to_email: to, subject, body, type: type || "notification", status: "sent" })
      .select()
      .single();
    if (logError) {
      return new Response(
        JSON.stringify({ error: "Email sent, but failed to log it: " + logError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "notification" && studentId) {
      await supabase.from("notifications").update({ sent: true, sent_at: new Date().toISOString() }).eq("student_id", studentId);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailLog?.id, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
