const ALLOWED_ORIGINS = new Set([
  "https://ashishpandey779.github.io",
  "https://uppandeydhaba.com",
  "https://www.uppandeydhaba.com"
]);

const FIREBASE_PROJECT_ID = "up-pandey-dhaba";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...corsHeaders(origin)
    }
  });
}

function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function utf8ToUint8Array(value) {
  return new TextEncoder().encode(value);
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function createGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);

  const header = base64UrlEncode(JSON.stringify({
    alg: "RS256",
    typ: "JWT"
  }));

  const claim = base64UrlEncode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: FCM_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));

  const unsignedToken = `${header}.${claim}`;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    utf8ToUint8Array(unsignedToken)
  );

  const jwt = `${unsignedToken}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const tokenData = await tokenResponse.json().catch(() => ({}));

  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error("Google OAuth token error:", JSON.stringify(tokenData));
    throw new Error("Unable to authenticate with Firebase Cloud Messaging.");
  }

  return tokenData.access_token;
}

async function sendFcmNotification({ serviceAccount, token, instagramId }) {
  const accessToken = await createGoogleAccessToken(serviceAccount);

  const response = await fetch(FCM_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: {
        token,
        notification: {
          title: "📸 New Customer Photo",
          body: `${instagramId || "A customer"} uploaded a new photo for review.`
        },
        data: {
          url: "/admin-photos.html",
          type: "customer_photo",
          uploadedBy: instagramId || "customer"
        },
        webpush: {
          fcmOptions: {
            link: "/admin-photos.html"
          }
        }
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("FCM send error:", JSON.stringify(data));
    throw new Error("Unable to send the Firebase notification.");
  }

  return data;
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
      return jsonResponse({ error: "Method not allowed." }, 405, origin);
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse({ error: "Origin not allowed." }, 403, origin);
    }

    if (!env.FIREBASE_SERVICE_ACCOUNT) {
      console.error("FIREBASE_SERVICE_ACCOUNT is unavailable in this Worker deployment.");
      return jsonResponse({ error: "Notification service is not configured." }, 500, origin);
    }

    try {
      const body = await request.json();
      const instagramId = String(body.instagramId || "").trim();
      const submissionId = String(body.submissionId || "").trim();
      const adminToken = String(body.adminToken || "").trim();

      if (!submissionId || !adminToken) {
        return jsonResponse({ error: "Notification fields are missing." }, 400, origin);
      }

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
      } catch {
        console.error("Invalid FIREBASE_SERVICE_ACCOUNT JSON.");
        return jsonResponse({ error: "Notification service credentials are invalid." }, 500, origin);
      }

      await sendFcmNotification({
        serviceAccount,
        token: adminToken,
        instagramId
      });

      return jsonResponse({
        ok: true,
        submissionId,
        notification: "sent"
      }, 200, origin);
    } catch (error) {
      console.error("Customer photo notification error:", error);
      return jsonResponse({ error: "Unable to send the admin notification." }, 502, origin);
    }
  }
};
