const PAYPAL_BASE = "https://api-m.paypal.com";
const FIREBASE_DB_BASE = "https://hallvalla-online-default-rtdb.firebaseio.com";
const FIREBASE_WEB_API_KEY = "AIzaSyA6C6f3gSVDvgxcQuyD8PsyQiHNDPD_ZOQ";
const HALLVALLA_MASTER_ADMIN_UID = "5V3mDjSyeNbI7W0qI16cEz5PbsN2";

const OFFERS = Object.freeze({
  support_gems_100:   { amount: "0.99", currency: "USD", kind: "gems", gems: 100, gold: 0, basicPacks: 0 },
  support_gems_250:   { amount: "1.99", currency: "USD", kind: "gems", gems: 250, gold: 0, basicPacks: 0 },
  support_gems_500:   { amount: "2.99", currency: "USD", kind: "gems", gems: 500, gold: 0, basicPacks: 0 },
  support_gems_1000:  { amount: "4.99", currency: "USD", kind: "gems", gems: 1000, gold: 0, basicPacks: 0 },
  support_gems_2500:  { amount: "9.99", currency: "USD", kind: "gems", gems: 2500, gold: 0, basicPacks: 0 },
  support_gems_5000:  { amount: "14.99", currency: "USD", kind: "gems", gems: 5000, gold: 0, basicPacks: 0 },
  support_gems_10000: { amount: "24.99", currency: "USD", kind: "gems", gems: 10000, gold: 0, basicPacks: 0 },
  support_gems_25000: { amount: "39.99", currency: "USD", kind: "gems", gems: 25000, gold: 0, basicPacks: 0 },
  welcome_pack_v1:    { amount: "0.99", currency: "USD", kind: "welcome", gems: 10, gold: 300, basicPacks: 3 }
});

let cachedPayPalToken = null;
let cachedPayPalTokenExpiresAt = 0;
let cachedGoogleToken = null;
let cachedGoogleTokenExpiresAt = 0;
let cachedServiceAccount = null;
let cachedServiceKey = null;

function isAllowedOrigin(origin) {
  return (
    origin === "https://elberlord.github.io" ||
    origin === "https://appassets.androidplatform.net" ||
    /^http:\/\/localhost(?::\d+)?$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)
  );
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
  if (isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(request)
  });
}

function getBearerToken(request) {
  const value = String(request.headers.get("Authorization") || "").trim();
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function base64UrlBytes(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlText(value) {
  return base64UrlBytes(new TextEncoder().encode(value));
}

function pemToArrayBuffer(pem) {
  const base64 = String(pem || "")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  if (!base64) throw new Error("FIREBASE_PRIVATE_KEY_MISSING");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function getServiceAccount(env) {
  if (cachedServiceAccount) return cachedServiceAccount;

  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_MISSING");
  }

  let account;
  try {
    account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_INVALID_JSON");
  }

  if (
    account?.type !== "service_account" ||
    account?.project_id !== "hallvalla-online" ||
    !String(account?.client_email || "").endsWith("@hallvalla-online.iam.gserviceaccount.com") ||
    !String(account?.private_key || "").includes("BEGIN PRIVATE KEY")
  ) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_INVALID");
  }

  cachedServiceAccount = account;
  return account;
}

async function getServiceAccountSigningKey(env) {
  if (cachedServiceKey) return cachedServiceKey;

  const account = getServiceAccount(env);

  cachedServiceKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(account.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  return cachedServiceKey;
}

async function getGoogleAccessToken(env) {
  const now = Date.now();

  if (
    cachedGoogleToken &&
    now < cachedGoogleTokenExpiresAt - 60000
  ) {
    return cachedGoogleToken;
  }

  const account = getServiceAccount(env);
  const signingKey = await getServiceAccountSigningKey(env);

  const issuedAt = Math.floor(now / 1000);

  const header = base64UrlText(JSON.stringify({
    alg: "RS256",
    typ: "JWT"
  }));

  const payload = base64UrlText(JSON.stringify({
    iss: account.client_email,
    scope:
      "https://www.googleapis.com/auth/firebase.database " +
      "https://www.googleapis.com/auth/userinfo.email",
    aud: "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: issuedAt + 3600
  }));

  const unsigned = `${header}.${payload}`;

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      signingKey,
      new TextEncoder().encode(unsigned)
    )
  );

  const assertion =
    `${unsigned}.${base64UrlBytes(signature)}`;

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion
      })
    }
  );

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    console.error(
      "Google OAuth failed",
      response.status,
      data?.error || "unknown"
    );
    throw new Error("FIREBASE_SERVER_AUTH_FAILED");
  }

  cachedGoogleToken = data.access_token;
  cachedGoogleTokenExpiresAt =
    now +
    Math.max(
      60,
      Number(data.expires_in) || 3600
    ) *
      1000;

  return cachedGoogleToken;
}

async function verifyFirebaseUser(idToken) {
  if (!idToken) {
    throw new Error("FIREBASE_ID_TOKEN_MISSING");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ idToken })
    }
  );

  const data =
    await response.json().catch(() => ({}));

  const user =
    Array.isArray(data?.users)
      ? data.users[0]
      : null;

  if (!response.ok || !user?.localId) {
    throw new Error("FIREBASE_ID_TOKEN_INVALID");
  }

  const uid =
    String(user.localId || "").trim();

  if (!uid || uid.length > 160) {
    throw new Error("FIREBASE_UID_INVALID");
  }

  const displayName =
    String(
      user.displayName ||
      user.email?.split("@")[0] ||
      "Jugador"
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 24) || "Jugador";

  return { uid, displayName };
}

async function getPayPalToken(env) {
  const now = Date.now();

  if (
    cachedPayPalToken &&
    now < cachedPayPalTokenExpiresAt - 60000
  ) {
    return cachedPayPalToken;
  }

  if (
    !env.PAYPAL_CLIENT_ID ||
    !env.PAYPAL_CLIENT_SECRET
  ) {
    throw new Error("PAYPAL_CREDENTIALS_MISSING");
  }

  const basic = btoa(
    `${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`
  );

  const response = await fetch(
    `${PAYPAL_BASE}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type":
          "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: "grant_type=client_credentials"
    }
  );

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    console.error(
      "PayPal OAuth failed",
      response.status,
      data?.error || "unknown"
    );
    throw new Error("PAYPAL_AUTH_FAILED");
  }

  cachedPayPalToken = data.access_token;
  cachedPayPalTokenExpiresAt =
    now +
    Math.max(
      60,
      Number(data.expires_in) || 300
    ) *
      1000;

  return cachedPayPalToken;
}

async function getPayPalOrder(orderId, env) {
  const token = await getPayPalToken(env);

  const response = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  const data =
    await response.json().catch(() => ({}));

  return { response, data };
}

function verifyPayPalOrder(
  order,
  { orderId, uid, offerId }
) {
  const offer = OFFERS[offerId];

  if (!offer)
    return {
      valid: false,
      reason: "UNKNOWN_OFFER"
    };

  if (!order || order.id !== orderId)
    return {
      valid: false,
      reason: "ORDER_ID_MISMATCH"
    };

  if (order.status !== "COMPLETED")
    return {
      valid: false,
      reason: "ORDER_NOT_COMPLETED"
    };

  const units =
    Array.isArray(order.purchase_units)
      ? order.purchase_units
      : [];

  if (units.length !== 1)
    return {
      valid: false,
      reason: "PURCHASE_UNIT_INVALID"
    };

  const unit = units[0];

  const expectedCustomId =
    `${offerId}:${String(uid).slice(0, 48)}`;

  if (unit?.custom_id !== expectedCustomId)
    return {
      valid: false,
      reason: "CUSTOM_ID_MISMATCH"
    };

  if (
    unit?.amount?.currency_code !== offer.currency ||
    unit?.amount?.value !== offer.amount
  ) {
    return {
      valid: false,
      reason: "ORDER_AMOUNT_MISMATCH"
    };
  }

  const captures =
    Array.isArray(unit?.payments?.captures)
      ? unit.payments.captures
      : [];

  const completedCaptures =
    captures.filter(
      capture =>
        capture?.status === "COMPLETED" &&
        capture?.id
    );

  if (completedCaptures.length !== 1)
    return {
      valid: false,
      reason: "CAPTURE_INVALID"
    };

  const capture = completedCaptures[0];

  if (
    capture?.amount?.currency_code !== offer.currency ||
    capture?.amount?.value !== offer.amount
  ) {
    return {
      valid: false,
      reason: "CAPTURE_AMOUNT_MISMATCH"
    };
  }

  return {
    valid: true,
    orderId: order.id,
    captureId: String(capture.id),
    offerId,
    offer
  };
}

function databaseUrl(path = "") {
  const clean =
    String(path || "")
      .replace(/^\/+|\/+$/g, "");

  if (!clean)
    return `${FIREBASE_DB_BASE}/.json`;

  const encoded =
    clean
      .split("/")
      .map(part => encodeURIComponent(part))
      .join("/");

  return `${FIREBASE_DB_BASE}/${encoded}.json`;
}

async function databaseFetch(
  path,
  {
    method = "GET",
    token,
    body,
    headers = {}
  } = {}
) {
  const response = await fetch(
    databaseUrl(path),
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined
          ? {
              "Content-Type":
                "application/json"
            }
          : {}),
        ...headers
      },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body)
    }
  );

  const text = await response.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { response, data };
}

async function databaseGet(path, token) {
  const { response, data } =
    await databaseFetch(path, { token });

  if (!response.ok) {
    throw new Error(
      `FIREBASE_READ_FAILED_${response.status}`
    );
  }

  return data;
}

async function reserveRecord(
  path,
  value,
  token
) {
  const first =
    await databaseFetch(
      path,
      {
        token,
        headers: {
          "X-Firebase-ETag": "true"
        }
      }
    );

  if (!first.response.ok) {
    throw new Error(
      `FIREBASE_RESERVE_READ_FAILED_${first.response.status}`
    );
  }

  if (first.data !== null) {
    return {
      created: false,
      data: first.data
    };
  }

  const etag =
    first.response.headers.get("ETag");

  if (!etag) {
    throw new Error(
      "FIREBASE_ETAG_MISSING"
    );
  }

  const put =
    await databaseFetch(
      path,
      {
        method: "PUT",
        token,
        body: value,
        headers: {
          "if-match": etag
        }
      }
    );

  if (put.response.status === 412) {
    return {
      created: false,
      data:
        await databaseGet(
          path,
          token
        )
    };
  }

  if (!put.response.ok) {
    throw new Error(
      `FIREBASE_RESERVE_WRITE_FAILED_${put.response.status}`
    );
  }

  return {
    created: true,
    data: put.data ?? value
  };
}

function sameReservation(
  existing,
  expected,
  fields
) {
  if (
    !existing ||
    typeof existing !== "object"
  ) {
    return false;
  }

  return fields.every(
    field =>
      String(existing[field] ?? "") ===
      String(expected[field] ?? "")
  );
}

async function finalizePurchase(
  {
    uid,
    displayName,
    orderId,
    captureId,
    offerId,
    offer
  },
  env
) {
  const token =
    await getGoogleAccessToken(env);

  const requestId =
    `paypalv146_${orderId}`;

  const now = Date.now();

  const orderMarker = {
    orderId,
    requestId,
    uid,
    offerId,
    approvedAt: now,
    approvedBy:
      HALLVALLA_MASTER_ADMIN_UID
  };

  const orderReservation =
    await reserveRecord(
      `community/paypalApprovedOrders/${orderId}`,
      orderMarker,
      token
    );

  if (
    !orderReservation.created &&
    !sameReservation(
      orderReservation.data,
      orderMarker,
      [
        "orderId",
        "uid",
        "offerId"
      ]
    )
  ) {
    return {
      ok: false,
      valid: false,
      reason: "ORDER_ALREADY_USED",
      status: 409
    };
  }

  const approvedAt =
    Number(
      orderReservation.data?.approvedAt ||
      orderMarker.approvedAt ||
      now
    );

  orderMarker.approvedAt =
    approvedAt;

  const captureMarker = {
    captureId,
    orderId,
    requestId,
    uid,
    offerId,
    approvedAt,
    approvedBy:
      HALLVALLA_MASTER_ADMIN_UID
  };

  const captureReservation =
    await reserveRecord(
      `community/paypalApprovedCaptures/${captureId}`,
      captureMarker,
      token
    );

  if (
    !captureReservation.created &&
    !sameReservation(
      captureReservation.data,
      captureMarker,
      [
        "captureId",
        "orderId",
        "uid",
        "offerId"
      ]
    )
  ) {
    return {
      ok: false,
      valid: false,
      reason: "CAPTURE_ALREADY_USED",
      status: 409
    };
  }

  if (offer.kind === "welcome") {
    const welcomeMarker = {
      uid,
      requestId,
      claimedAt: approvedAt,
      approvedBy:
        HALLVALLA_MASTER_ADMIN_UID
    };

    const welcomeReservation =
      await reserveRecord(
        `community/welcomeClaims/${uid}`,
        welcomeMarker,
        token
      );

    if (
      !welcomeReservation.created &&
      String(
        welcomeReservation.data?.requestId ||
        ""
      ) !== requestId
    ) {
      return {
        ok: false,
        valid: false,
        reason:
          "WELCOME_ALREADY_CLAIMED",
        status: 409
      };
    }
  }

  const patch = {};
  const rewardBase =
    `paypal_${requestId}`;
  const rewardIds = [];

  if (offer.kind === "gems") {
    const id =
      `${rewardBase}_gems`;

    rewardIds.push(id);

    patch[
      `community/adminRewards/${uid}/${id}`
    ] = {
      rewardId: id,
      targetUid: uid,
      type: "gems",
      amount: offer.gems,
      packTier: "",
      note:
        `Gracias por apoyar HallValla · PayPal ${orderId}`,
      createdAt: approvedAt,
      createdBy:
        HALLVALLA_MASTER_ADMIN_UID
    };
  }

  if (offer.kind === "welcome") {
    const gemId =
      `${rewardBase}_gems`;

    const goldId =
      `${rewardBase}_gold`;

    const packId =
      `${rewardBase}_packs`;

    rewardIds.push(
      gemId,
      goldId,
      packId
    );

    patch[
      `community/adminRewards/${uid}/${gemId}`
    ] = {
      rewardId: gemId,
      targetUid: uid,
      type: "gems",
      amount: offer.gems,
      packTier: "",
      note:
        "Paquete de bienvenida · Gemas",
      createdAt: approvedAt,
      createdBy:
        HALLVALLA_MASTER_ADMIN_UID
    };

    patch[
      `community/adminRewards/${uid}/${goldId}`
    ] = {
      rewardId: goldId,
      targetUid: uid,
      type: "gold",
      amount: offer.gold,
      packTier: "",
      note:
        "Paquete de bienvenida · Oro",
      createdAt: approvedAt + 1,
      createdBy:
        HALLVALLA_MASTER_ADMIN_UID
    };

    patch[
      `community/adminRewards/${uid}/${packId}`
    ] = {
      rewardId: packId,
      targetUid: uid,
      type: "pack",
      amount: offer.basicPacks,
      packTier: "basic",
      note:
        "Paquete de bienvenida · Sobres básicos",
      createdAt: approvedAt + 2,
      createdBy:
        HALLVALLA_MASTER_ADMIN_UID
    };

    patch[
      `community/welcomeClaims/${uid}`
    ] = {
      uid,
      requestId,
      claimedAt: approvedAt,
      approvedBy:
        HALLVALLA_MASTER_ADMIN_UID
    };
  }

  patch[
    `community/paypalApprovedOrders/${orderId}`
  ] = orderMarker;

  patch[
    `community/paypalApprovedCaptures/${captureId}`
  ] = captureMarker;

  patch[
    `community/supportRequestsV146/${uid}/${requestId}`
  ] = {
    requestId,
    uid,
    playerName: displayName,
    kind: offer.kind,
    offerId,
    amountUsd: offer.amount,
    gems: offer.gems,
    gold: offer.gold,
    basicPacks:
      offer.basicPacks,
    paypalOrderId: orderId,
    paypalCaptureId: captureId,
    paypalStatus: "COMPLETED",
    createdAt: approvedAt,
    status: "approved",
    reviewedAt: approvedAt,
    reviewedBy:
      HALLVALLA_MASTER_ADMIN_UID,
    adminNote:
      "Pago verificado automáticamente por HallValla PayPal Worker."
  };

  const updated =
    await databaseFetch(
      "",
      {
        method: "PATCH",
        token,
        body: patch
      }
    );

  if (!updated.response.ok) {
    throw new Error(
      `FIREBASE_FINALIZE_FAILED_${updated.response.status}`
    );
  }

  return {
    ok: true,
    valid: true,
    claimed: true,
    idempotent:
      !orderReservation.created,
    requestId,
    orderId,
    captureId,
    offerId,
    rewardIds
  };
}

function publicErrorReason(error) {
  const message =
    String(
      error?.message ||
      error ||
      ""
    );

  if (
    message.startsWith(
      "FIREBASE_ID_TOKEN_"
    )
  ) {
    return "AUTH_INVALID";
  }

  if (
    message.startsWith(
      "FIREBASE_SERVER_AUTH_"
    )
  ) {
    return "SERVER_AUTH_FAILED";
  }

  if (
    message.startsWith(
      "FIREBASE_SERVICE_ACCOUNT_"
    )
  ) {
    return "SERVER_CREDENTIALS_INVALID";
  }

  if (
    message.startsWith(
      "FIREBASE_"
    )
  ) {
    return "DATABASE_FAILED";
  }

  if (
    message.startsWith(
      "PAYPAL_"
    )
  ) {
    return "PAYPAL_FAILED";
  }

  return "SERVER_ERROR";
}

export default {
  async fetch(request, env) {
    if (
      request.method === "OPTIONS"
    ) {
      return new Response(
        null,
        {
          status: 204,
          headers:
            corsHeaders(request)
        }
      );
    }

    const url =
      new URL(request.url);

    if (
      request.method === "GET" &&
      url.pathname === "/"
    ) {
      return json(
        request,
        {
          ok: true,
          service:
            "hallvalla-paypal-verify",
          revision: 2,
          mode:
            "firebase-authenticated-auto-delivery"
        }
      );
    }

    if (
      request.method === "POST" &&
      url.pathname === "/self-test"
    ) {
      const origin =
        request.headers.get(
          "Origin"
        ) || "";

      if (
        origin &&
        !isAllowedOrigin(origin)
      ) {
        return json(
          request,
          {
            ok: false,
            reason:
              "ORIGIN_NOT_ALLOWED"
          },
          403
        );
      }

      try {
        const firebaseUser =
          await verifyFirebaseUser(
            getBearerToken(request)
          );

        if (
          firebaseUser.uid !==
          HALLVALLA_MASTER_ADMIN_UID
        ) {
          return json(
            request,
            {
              ok: false,
              reason: "ADMIN_ONLY"
            },
            403
          );
        }

        const databaseToken =
          await getGoogleAccessToken(
            env
          );

        await databaseGet(
          `community/welcomeClaims/${firebaseUser.uid}`,
          databaseToken
        );

        await getPayPalToken(env);

        return json(
          request,
          {
            ok: true,
            revision: 2,
            firebaseUserVerified:
              true,
            firebaseDatabaseAdmin:
              true,
            paypalLiveAuthenticated:
              true
          }
        );
      } catch (error) {
        console.error(
          "HallValla PayPal self-test error",
          error?.message ||
            error
        );

        const reason =
          publicErrorReason(error);

        const status =
          reason === "AUTH_INVALID"
            ? 401
            : 500;

        return json(
          request,
          {
            ok: false,
            reason
          },
          status
        );
      }
    }

    if (
      request.method !== "POST" ||
      url.pathname !== "/claim"
    ) {
      return json(
        request,
        {
          ok: false,
          error: "NOT_FOUND"
        },
        404
      );
    }

    const origin =
      request.headers.get(
        "Origin"
      ) || "";

    if (
      origin &&
      !isAllowedOrigin(origin)
    ) {
      return json(
        request,
        {
          ok: false,
          valid: false,
          reason:
            "ORIGIN_NOT_ALLOWED"
        },
        403
      );
    }

    let body;

    try {
      body =
        await request.json();
    } catch {
      return json(
        request,
        {
          ok: false,
          valid: false,
          reason:
            "INVALID_JSON"
        },
        400
      );
    }

    const orderId =
      String(
        body?.orderId || ""
      )
        .trim()
        .toUpperCase();

    const offerId =
      String(
        body?.offerId || ""
      ).trim();

    if (
      !/^[A-Z0-9]{6,36}$/.test(
        orderId
      )
    ) {
      return json(
        request,
        {
          ok: false,
          valid: false,
          reason:
            "INVALID_ORDER_ID"
        },
        400
      );
    }

    if (!OFFERS[offerId]) {
      return json(
        request,
        {
          ok: false,
          valid: false,
          reason:
            "UNKNOWN_OFFER"
        },
        400
      );
    }

    try {
      const firebaseUser =
        await verifyFirebaseUser(
          getBearerToken(request)
        );

      const {
        response,
        data: order
      } =
        await getPayPalOrder(
          orderId,
          env
        );

      if (
        response.status === 404
      ) {
        return json(
          request,
          {
            ok: true,
            valid: false,
            reason:
              "ORDER_NOT_FOUND"
          },
          404
        );
      }

      if (!response.ok) {
        console.error(
          "PayPal order lookup failed",
          response.status,
          order?.name ||
            "unknown"
        );

        return json(
          request,
          {
            ok: false,
            valid: false,
            reason:
              "PAYPAL_LOOKUP_FAILED"
          },
          502
        );
      }

      const verified =
        verifyPayPalOrder(
          order,
          {
            orderId,
            uid:
              firebaseUser.uid,
            offerId
          }
        );

      if (!verified.valid) {
        return json(
          request,
          {
            ok: true,
            valid: false,
            reason:
              verified.reason
          },
          409
        );
      }

      const result =
        await finalizePurchase(
          {
            uid:
              firebaseUser.uid,
            displayName:
              firebaseUser.displayName,
            orderId:
              verified.orderId,
            captureId:
              verified.captureId,
            offerId,
            offer:
              verified.offer
          },
          env
        );

      if (!result.ok) {
        return json(
          request,
          result,
          result.status || 409
        );
      }

      return json(
        request,
        result,
        200
      );
    } catch (error) {
      console.error(
        "HallValla PayPal claim error",
        error?.message ||
          error
      );

      const reason =
        publicErrorReason(error);

      const status =
        reason === "AUTH_INVALID"
          ? 401
          : 500;

      return json(
        request,
        {
          ok: false,
          valid: false,
          reason
        },
        status
      );
    }
  }
};