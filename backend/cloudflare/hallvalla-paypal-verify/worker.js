const PAYPAL_BASE = "https://api-m.paypal.com";

const OFFERS = Object.freeze({
  support_gems_100:   { amount: "0.99", currency: "USD" },
  support_gems_250:   { amount: "1.99", currency: "USD" },
  support_gems_500:   { amount: "2.99", currency: "USD" },
  support_gems_1000:  { amount: "4.99", currency: "USD" },
  support_gems_2500:  { amount: "9.99", currency: "USD" },
  support_gems_5000:  { amount: "14.99", currency: "USD" },
  support_gems_10000: { amount: "24.99", currency: "USD" },
  support_gems_25000: { amount: "39.99", currency: "USD" },
  welcome_pack_v1:    { amount: "0.99", currency: "USD" },
});

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";

  const allowed =
    origin === "https://elberlord.github.io" ||
    origin === "https://appassets.androidplatform.net" ||
    /^http:\/\/localhost(?::\d+)?$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin);

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };

  if (allowed) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  headers["Access-Control-Allow-Headers"] = "Content-Type";
  headers["Access-Control-Max-Age"] = "86400";

  return headers;
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(request),
  });
}

async function getPayPalToken(env) {
  const now = Date.now();

  if (cachedToken && now < cachedTokenExpiresAt - 60000) {
    return cachedToken;
  }

  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
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
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    console.error(
      "PayPal OAuth failed",
      response.status,
      data?.error || "unknown"
    );
    throw new Error("PAYPAL_AUTH_FAILED");
  }

  cachedToken = data.access_token;
  cachedTokenExpiresAt =
    now + Math.max(60, Number(data.expires_in) || 300) * 1000;

  return cachedToken;
}

async function getOrder(orderId, env) {
  const token = await getPayPalToken(env);

  const response = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  const data = await response.json().catch(() => ({}));

  return { response, data };
}

function verifyOrder(order, { orderId, uid, offerId }) {
  const offer = OFFERS[offerId];

  if (!offer) {
    return { valid: false, reason: "UNKNOWN_OFFER" };
  }

  if (!order || order.id !== orderId) {
    return { valid: false, reason: "ORDER_ID_MISMATCH" };
  }

  if (order.status !== "COMPLETED") {
    return { valid: false, reason: "ORDER_NOT_COMPLETED" };
  }

  const units = Array.isArray(order.purchase_units)
    ? order.purchase_units
    : [];

  if (units.length !== 1) {
    return { valid: false, reason: "PURCHASE_UNIT_INVALID" };
  }

  const unit = units[0];

  const expectedCustomId =
    `${offerId}:${String(uid).slice(0, 48)}`;

  if (unit?.custom_id !== expectedCustomId) {
    return { valid: false, reason: "CUSTOM_ID_MISMATCH" };
  }

  if (
    unit?.amount?.currency_code !== offer.currency ||
    unit?.amount?.value !== offer.amount
  ) {
    return { valid: false, reason: "ORDER_AMOUNT_MISMATCH" };
  }

  const captures = Array.isArray(unit?.payments?.captures)
    ? unit.payments.captures
    : [];

  const completedCaptures =
    captures.filter(
      (capture) =>
        capture?.status === "COMPLETED" &&
        capture?.id
    );

  if (completedCaptures.length !== 1) {
    return { valid: false, reason: "CAPTURE_INVALID" };
  }

  const capture = completedCaptures[0];

  if (
    capture?.amount?.currency_code !== offer.currency ||
    capture?.amount?.value !== offer.amount
  ) {
    return { valid: false, reason: "CAPTURE_AMOUNT_MISMATCH" };
  }

  return {
    valid: true,
    orderId: order.id,
    captureId: capture.id,
    offerId,
    amountUsd: offer.amount,
    currency: offer.currency,
    status: "COMPLETED",
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    const url = new URL(request.url);

    if (
      request.method === "GET" &&
      url.pathname === "/"
    ) {
      return json(request, {
        ok: true,
        service: "hallvalla-paypal-verify",
        revision: 1,
      });
    }

    if (
      request.method !== "POST" ||
      url.pathname !== "/verify"
    ) {
      return json(
        request,
        { ok: false, error: "NOT_FOUND" },
        404
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json(
        request,
        { ok: false, error: "INVALID_JSON" },
        400
      );
    }

    const orderId = String(body?.orderId || "")
      .trim()
      .toUpperCase();

    const uid = String(body?.uid || "").trim();
    const offerId = String(body?.offerId || "").trim();

    if (!/^[A-Z0-9]{6,36}$/.test(orderId)) {
      return json(
        request,
        {
          ok: false,
          valid: false,
          reason: "INVALID_ORDER_ID",
        },
        400
      );
    }

    if (!uid || uid.length > 128) {
      return json(
        request,
        {
          ok: false,
          valid: false,
          reason: "INVALID_UID",
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
          reason: "UNKNOWN_OFFER",
        },
        400
      );
    }

    try {
      const { response, data: order } =
        await getOrder(orderId, env);

      if (response.status === 404) {
        return json(request, {
          ok: true,
          valid: false,
          reason: "ORDER_NOT_FOUND",
        });
      }

      if (!response.ok) {
        console.error(
          "PayPal order lookup failed",
          response.status,
          order?.name || "unknown"
        );

        return json(
          request,
          {
            ok: false,
            valid: false,
            reason: "PAYPAL_LOOKUP_FAILED",
          },
          502
        );
      }

      const result =
        verifyOrder(order, {
          orderId,
          uid,
          offerId,
        });

      return json(request, {
        ok: true,
        ...result,
      });
    } catch (error) {
      console.error(
        "Verifier error",
        error?.message || error
      );

      return json(
        request,
        {
          ok: false,
          valid: false,
          reason: "VERIFIER_ERROR",
        },
        500
      );
    }
  },
};