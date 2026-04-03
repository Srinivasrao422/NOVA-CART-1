const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://nova-cart-1-tn1h.onrender.com";

const AUTH_EVENT = "nova-cart:auth";

/* TOKEN */

function getToken() {
  return localStorage.getItem("nova_cart_token");
}

export function setToken(token) {
  if (!token) localStorage.removeItem("nova_cart_token");
  else localStorage.setItem("nova_cart_token", token);
}

export function getApiBase() {
  return BASE_URL;
}

/* HELPERS */

async function parseJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function emitAuthEvent(detail) {
  try {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail }));
  } catch {}
}

/* CORE */

export async function apiRequest(
  path,
  { method = "GET", body, auth = true, headers } = {}
) {
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

    const msg = (data && data.message) || res.statusText || "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export function onAuthEvent(handler) {
  const listener = (e) => handler(e && e.detail);
  window.addEventListener(AUTH_EVENT, listener);
  return () => window.removeEventListener(AUTH_EVENT, listener);
}

/* AUTH */

export const authApi = {
  register: (payload) =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  login: (payload) =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  google: (payload) =>
    apiRequest("/api/auth/google", {
      method: "POST",
      body: payload,
      auth: false,
    }),
};

/* PRODUCTS */

export const productApi = {
  list: (params) => {
    const qs = params ? new URLSearchParams(params).toString() : "";
    return apiRequest(
      qs ? `/api/products?${qs}` : "/api/products",
      { auth: false }
    );
  },

  get: (id) => apiRequest(`/api/products/${id}`, { auth: false }),

  create: (payload) =>
    apiRequest("/api/products", {
      method: "POST",
      body: payload,
      auth: true,
    }),
};

/* CART */

export const cartApi = {
  getByUserId: (userId) => apiRequest(`/api/cart/${userId}`),

  add: ({ productId, quantity }) =>
    apiRequest("/api/cart/add", {
      method: "POST",
      body: { productId, quantity },
    }),

  update: ({ productId, quantity }) =>
    apiRequest("/api/cart/update", {
      method: "PUT",
      body: { productId, quantity },
    }),

  remove: (productId) =>
    apiRequest(`/api/cart/remove/${productId}`, {
      method: "DELETE",
    }),

  applyCoupon: (couponCode) =>
    apiRequest("/api/cart/apply-coupon", {
      method: "POST",
      body: { couponCode },
    }),
};

/* ORDERS */

export const orderApi = {
  createFromCart: ({ paymentMethod, address, upiId, simulateFailure }) =>
    apiRequest("/api/orders", {
      method: "POST",
      body: { paymentMethod, address, upiId, simulateFailure },
    }),

  listByUserId: (userId) =>
    apiRequest(`/api/orders/${userId}`),

  updateStatus: ({ orderId, status }) =>
    apiRequest("/api/orders/status", {
      method: "PUT",
      body: { orderId, status },
    }),
};
