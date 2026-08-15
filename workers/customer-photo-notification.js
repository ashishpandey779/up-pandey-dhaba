const ALLOWED_ORIGINS = new Set([
  "https://uppandeydhaba.com",
  "https://www.uppandeydhaba.com"
]);

function getCorsOrigin(request) {
  const origin = request.headers.get("Origin") || "";
  return ALLOWED_ORIGINS.has(origin) ? origin : "null";
}

function jsonResponse(body, status, request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Access-Control-Allow-Origin": getCorsOrigin(request),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
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
    if (request.method === "OPTIONS") {
      return jsonResponse({}, 204, request);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405, request);
    }

    const origin = request.headers.get("Origin") || "";
    if (!ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse({ error: "Origin not allowed." }, 403, request);
    }

    if (!env.RESEND_API_KEY) {
      return jsonResponse({ error: "Email service is not configured." }, 500, request);
    }

    try {
      const body = await request.json();
      const instagramId = String(body.instagramId || "").trim();
      const comment = String(body.comment || "").trim();
      const contact = String(body.contact || "").trim();
      const imageUrl = String(body.imageUrl || "").trim();
      const submissionId = String(body.submissionId || "").trim();

      if (!instagramId || !comment || !contact || !imageUrl || !submissionId) {
        return jsonResponse({ error: "Required notification fields are missing." }, 400, request);
      }

      const html = `
        <div style="margin:0;background:#f4f1eb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#24180f;">
          <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e8dfd2;border-radius:16px;overflow:hidden;">
            <div style="padding:26px 28px;background:#17100b;color:#fff3d0;">
              <div style="font-size:12px;letter-spacing:2px;font-weight:700;color:#f2bd58;">UP PANDEY DHABA</div>
              <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;">📸 New Customer Photo</h1>
            </div>
            <div style="padding:28px;">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">A customer has uploaded a new photo and it is waiting for your review.</p>
              <div style="background:#faf7f1;border:1px solid #eadfce;border-radius:12px;padding:18px;margin-bottom:20px;">
                <p style="margin:0 0 10px;"><strong>Instagram:</strong> ${escapeHtml(instagramId)}</p>
                <p style="margin:0 0 10px;"><strong>Private collaboration contact:</strong> ${escapeHtml(contact)}</p>
                <p style="margin:0 0 10px;"><strong>Submission ID:</strong> ${escapeHtml(submissionId)}</p>
                <p style="margin:0;"><strong>Status:</strong> Pending Review</p>
              </div>
              <p style="margin:0 0 8px;font-weight:700;">Customer comment</p>
              <blockquote style="margin:0 0 22px;padding:14px 16px;border-left:4px solid #d99a1b;background:#faf7f1;color:#4b3b2c;line-height:1.6;">${escapeHtml(comment)}</blockquote>
              <a href="${escapeHtml(imageUrl)}" style="display:inline-block;padding:12px 18px;border-radius:9px;background:#d99a1b;color:#17100b;text-decoration:none;font-weight:700;">View Uploaded Photo</a>
              <p style="margin:24px 0 0;color:#786b5d;font-size:12px;line-height:1.6;">The customer's collaboration contact is private and must not be published on the website, customer gallery, or shared outside the restaurant's collaboration process.</p>
            </div>
          </div>
        </div>
      `;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.RESEND_FROM || "UP Pandey Dhaba <onboarding@resend.dev>",
          to: [env.ADMIN_NOTIFICATION_EMAIL || "arindia.in@gmail.com"],
          subject: "📸 New Customer Photo Uploaded — UP Pandey Dhaba",
          html
        })
      });

      const resendData = await resendResponse.json();

      if (!resendResponse.ok) {
        console.error("Resend API error", resendData);
        return jsonResponse({ error: "Unable to send the admin notification." }, 502, request);
      }

      return jsonResponse({ ok: true, id: resendData.id || null }, 200, request);
    } catch (error) {
      console.error("Customer photo notification error", error);
      return jsonResponse({ error: "Unable to process the notification." }, 500, request);
    }
  }
};
