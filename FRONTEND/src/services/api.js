const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://nova-cart-1-tn1h.onrender.com";

const AUTH_EVENT = "nova-cart:auth";

/* =========================
   TOKEN HANDLING
========================= */

function getToken() {
  return localStorage.getItem("nova_cart_token");
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem("nova_cart_token");
  else localStorage.setItem("nova_cart_token", token);
}

export function getApiBase() {
  return BASE_URL;
}

/* =========================
   HELPERS
========================= */

async function parseJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function emitAuthEvent(detail: any) {
  try {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail }));
  } catch {
    // ignore
  }
}

/* =========================
   CORE API REQUEST
========================= */

export async function apiRequest(
  path: string,
  { method = "GET", body, auth = true, headers }: any = {}
) {
  // ✅ IMPORTANT FIX: ensure no double slashes or /api/api
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE_URL}${cleanPath}`;

  const token = auth ? getToken() : null;

  const res = await fetch(url, {
    method,
    headers: {
      ...(body != null ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const data = await parseJson(res);

  if (!res.ok) {
    if (res.status === 401) {
      emitAuthEvent({ type: "unauthorized" });
    }

    const msg = data?.message || res.statusText || "Request failed";
    const err: any = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export function onAuthEvent(handler: any) {
  const listener = (e: any) => handler(e?.detail);
  window.addEventListener(AUTH_EVENT, listener);
  return () => window.removeEventListener(AUTH_EVENT, listener);
}

/* =========================
   AUTH API
========================= */

export const authApi = {
  register: (payload: any) =>
    apiRequest("/api/auth/register", { method: "POST", body: payload, auth: false }),

  login: (payload: any) =>
    apiRequest("/api/auth/login", { method: "POST", body: payload, auth: false }),

  google: (payload: any) =>
    apiRequest("/api/auth/google", { method: "POST", body: payload, auth: false }),
};

/* =========================
   PRODUCT API
========================= */

export const productApi = {
  list: (params?: any) => {
    const qs = params ? new URLSearchParams(params).toString() : "";
    return apiRequest(qs ? `/api/products?${qs}` : "/api/products", { auth: false });
  },

  get: (id: string) =>
    apiRequest(`/api/products/${id}`, { auth: false }),

  create: (payload: any) =>
    apiRequest("/api/products", { method: "POST", body: payload, auth: true }),
};

/* =========================
   CART API
========================= */

export const cartApi = {
  getByUserId: (userId: string) =>
    apiRequest(`/api/cart/${userId}`),

  add: ({ productId, quantity }: any) =>
    apiRequest("/api/cart/add", {
      method: "POST",
      body: { productId, quantity },
    }),

  update: ({ productId, quantity }: any) =>
    apiRequest("/api/cart/update", {
      method: "PUT",
      body: { productId, quantity },
    }),

  remove: (productId: string) =>
    apiRequest(`/api/cart/remove/${productId}`, {
      method: "DELETE",
    }),

  applyCoupon: (couponCode: string) =>
    apiRequest("/api/cart/apply-coupon", {
      method: "POST",
      body: { couponCode },
    }),
};

/* =========================
   ORDER API
========================= */

export const orderApi = {
  createFromCart: ({ paymentMethod, address, upiId, simulateFailure }: any) =>
    apiRequest("/api/orders", {
      method: "POST",
      body: { paymentMethod, address, upiId, simulateFailure },
    }),

  listByUserId: (userId: string) =>
    apiRequest(`/api/orders/${userId}`),

  updateStatus: ({ orderId, status }: any) =>
    apiRequest("/api/orders/status", {
      method: "PUT",
      body: { orderId, status },
    }),
};
