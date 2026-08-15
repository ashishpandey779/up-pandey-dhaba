const ALLOWED_ORIGIN = "https://ashishpandey779.github.io";
const ADMIN_EMAIL = "arindia.in@gmail.com";
const FROM_EMAIL = "UP Pandey Dhaba <onboarding@resend.dev>";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin)
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405, origin);
    }

    if (origin !== ALLOWED_ORIGIN) {
      return json({ error: "Origin not allowed." }, 403, origin);
    }

    if (!env.RESEND_API_KEY) {
      return json({ error: "Email service is not configured." }, 500, origin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid JSON payload." }, 400, origin);
    }

    const instagramId = String(payload.instagramId || "").trim();
    const contactDetail = String(payload.contactDetail || "").trim();
    const comment = String(payload.comment || "").trim();
    const imageUrl = String(payload.imageUrl || "").trim();
    const submissionId = String(payload.submissionId || "").trim();

    if (!instagramId || !contactDetail || !comment || !imageUrl) {
      return json({ error: "Missing required notification fields." }, 400, origin);
    }

    const html = `
      <div style="margin:0;background:#f4f1ea;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#21150d;">
        <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #eadfc9;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08);">
          <div style="background:#160d07;padding:24px 28px;color:#fff3d0;">
            <div style="font-size:13px;letter-spacing:2px;color:#f5ad20;font-weight:700;">UP PANDEY DHABA</div>
            <h1 style="margin:8px 0 0;font-size:28px;line-height:1.2;">📸 New Customer Photo</h1>
          </div>

          <div style="padding:28px;">
            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">A customer has uploaded a new photo and submitted it for review.</p>

            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:9px 0;color:#7a6b5c;width:190px;">Instagram</td><td style="padding:9px 0;font-weight:700;">${escapeHtml(instagramId)}</td></tr>
              <tr><td style="padding:9px 0;color:#7a6b5c;vertical-align:top;">Private collaboration contact</td><td style="padding:9px 0;font-weight:700;">${escapeHtml(contactDetail)}</td></tr>
              <tr><td style="padding:9px 0;color:#7a6b5c;vertical-align:top;">Customer message</td><td style="padding:9px 0;line-height:1.6;">${escapeHtml(comment)}</td></tr>
              ${submissionId ? `<tr><td style="padding:9px 0;color:#7a6b5c;">Submission ID</td><td style="padding:9px 0;font-family:monospace;">${escapeHtml(submissionId)}</td></tr>` : ""}
            </table>

            <div style="margin-top:24px;">
              <a href="${escapeHtml(imageUrl)}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 18px;background:#f5ad20;color:#171006;text-decoration:none;border-radius:10px;font-weight:800;">View Customer Photo</a>
            </div>

            <div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:#fff8e8;border:1px solid #f1dfb1;color:#6d5b43;font-size:13px;line-height:1.6;">
              Please review this submission in the customer photo admin dashboard before publishing it.
            </div>
          </div>

          <div style="padding:18px 28px;border-top:1px solid #eee5d7;color:#8b7b69;font-size:12px;line-height:1.5;">
            This notification was generated automatically by the UP Pandey Dhaba website.
          </div>
        </div>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: "📸 New Customer Photo — UP Pandey Dhaba",
        html
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Resend API error", result);
      return json({ error: "Unable to send notification email." }, 502, origin);
    }

    return json({ success: true, id: result.id || null }, 200, origin);
  }
};
