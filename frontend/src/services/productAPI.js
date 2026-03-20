import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// ── Auth ───────────────────────────────────────────────────────────────────
export const loginUser            = (data)     => API.post("/auth/login",           data);
export const createUser           = (data)     => API.post("/auth/create-user",     data);
export const getUsers             = ()         => API.get("/auth/users");
export const updateUser           = (id, data) => API.put(`/auth/users/${id}`,      data);
export const deleteUser           = (id)       => API.delete(`/auth/users/${id}`);
export const forgotPassword       = (email)               => API.post("/auth/forgot-password", { email });
export const verifyOtp            = (email, otp)          => API.post("/auth/verify-otp", { email, otp });
export const resetPassword        = (email, newPassword)  => API.post("/auth/reset-password", { email, newPassword });

// ── Products ───────────────────────────────────────────────────────────────
export const getProducts    = (params) => API.get("/products",       { params });  // supports ?category=&search=&low_stock=
export const getProduct     = (id)     => API.get(`/products/${id}`);
export const createProduct  = (data)   => API.post("/products",       data);
export const updateProduct  = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct  = (id)     => API.delete(`/products/${id}`);
export const bulkUpload     = (file)   => {
  const form = new FormData();
  form.append("file", file);
  return API.post("/products/bulk-upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ── Orders ─────────────────────────────────────────────────────────────────
export const getOrders     = (params)     => API.get("/orders",        { params });  // supports ?status=&product_id=
export const getOrder      = (id)         => API.get(`/orders/${id}`);
export const createOrder   = (data)       => API.post("/orders",        data);       
export const updateOrder   = (id, data)   => API.put(`/orders/${id}`,   data);
export const deleteOrder   = (id)         => API.delete(`/orders/${id}`);

// ── Suppliers ──────────────────────────────────────────────────────────────
export const getSuppliers    = ()         => API.get("/suppliers");
export const getSupplier     = (id)       => API.get(`/suppliers/${id}`);
export const createSupplier  = (data)     => API.post("/suppliers",      data);      
export const updateSupplier  = (id, data) => API.put(`/suppliers/${id}`, data);      
export const deleteSupplier  = (id)       => API.delete(`/suppliers/${id}`);
export const getSupplierProducts = (id)   => API.get(`/suppliers/${id}/products`);

// ── Analytics ──────────────────────────────────────────────────────────────
export const getAnalytics    = ()         => API.get("/analytics");
export const getKPIs         = ()         => API.get("/analytics/kpis");
export const getInsights     = ()         => API.get("/analytics/insights");

// ── Forecast ───────────────────────────────────────────────────────────────
export const getForecast            = ()   => API.get("/forecast");
export const getProductForecast     = (id) => API.get(`/forecast/${id}`);

// ── Stock History ──────────────────────────────────────────────────────────
export const getHistory             = (id)     => API.get(`/history/${id}`);
export const getHistorySummary      = (id)     => API.get(`/history/${id}/summary`);
export const getAllHistory           = (params) => API.get("/history",        { params });

// ── Notifications ──────────────────────────────────────────────────────────
export const getNotifications       = (params) => API.get("/notifications",   { params });
export const getNotificationCount   = ()       => API.get("/notifications/count");

// ── AI Assistant ───────────────────────────────────────────────────────────
export const askAI         = (question) => API.get("/ai/ask",     { params: { question } });
export const getAISummary  = ()         => API.get("/ai/summary");