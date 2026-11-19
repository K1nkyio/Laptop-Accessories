const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const ADMIN_AUTH_STORAGE_KEY = "techhub-admin-auth";
let legacyAdminToken: string | null = null;

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order?: number;
  subcategories?: { id: string; name: string; slug: string }[];
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  brand: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  stock: number;
  discount_price: number | null;
  condition: string;
  specifications: string | null;
  warranty: string | null;
  status: string;
  category_id: string | null;
  subcategory_id: string | null;
  product_type: string | null;
  is_featured: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdminInquiry {
  id: string;
  product_id: string | null;
  product_name: string;
  customer_name: string | null;
  customer_phone: string | null;
  source: string;
  message: string;
  status: string;
  created_at: string;
}

export interface AdminNotification {
  id: string;
  type: "delivery" | "inquiry" | "review" | "stock";
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  created_at: string;
  href: string;
}

export interface AdminReview {
  id: string;
  product_id: string | null;
  product_name?: string | null;
  customer_name: string;
  rating: number;
  comment: string;
  status: string;
  is_featured: boolean;
  created_at: string;
}

export interface AdminAuthResponse {
  admin: { id: string; name: string; email: string; role: string };
  token?: string;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: "admin" | "super_admin";
}

export interface StoreSettings {
  storeName: string;
  supportPhone: string;
  whatsappNumber: string;
  defaultWarranty: string;
  shippingNote: string;
  showFeaturedProducts: boolean;
  showWarrantyStrip: boolean;
  showLowStockUrgency: boolean;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
}

export function getStoredAdminAuth(): AdminAuthResponse | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const auth = JSON.parse(raw) as AdminAuthResponse;
    if (auth.token) {
      legacyAdminToken = auth.token;
      window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify({ admin: auth.admin }));
      return { admin: auth.admin, token: auth.token };
    }
    return auth;
  } catch (_error) {
    return null;
  }
}

export function storeAdminAuth(auth: AdminAuthResponse) {
  legacyAdminToken = null;
  window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify({ admin: auth.admin }));
  window.dispatchEvent(new Event("techhub-admin-auth-change"));
}

export function clearAdminAuth() {
  window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  legacyAdminToken = null;
  window.dispatchEvent(new Event("techhub-admin-auth-change"));
  void request<{ ok: true }>("/api/admin/auth/logout", { method: "POST" }).catch(() => {});
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (_error) {
    throw new Error("Could not connect to the API on port 4000.");
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload as T;
}

export async function loginAdmin(input: { email: string; password: string }) {
  return request<AdminAuthResponse>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function registerAdmin(input: { name: string; email: string; password: string; role?: "admin" | "super_admin" }) {
  return request<AdminAuthResponse>("/api/admin/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchAdminAccounts() {
  const data = await request<{ admins: AdminAccount[] }>("/api/admin/accounts");
  return data.admins;
}

export async function deleteAdminAccount(id: string) {
  return request<{ ok: true }>(`/api/admin/accounts/${id}`, { method: "DELETE" });
}

export async function fetchAdminBootstrap() {
  return request<{ needsAdmin: boolean }>("/api/admin/auth/bootstrap");
}

export async function requestAdminPasswordReset(email: string) {
  return request<{ ok: true; message: string; resetToken?: string }>("/api/admin/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmAdminPasswordReset(input: { token: string; password: string }) {
  return request<{ ok: true }>("/api/admin/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchAdminSession() {
  getStoredAdminAuth();
  if (legacyAdminToken) {
    await request<{ ok: true }>("/api/admin/auth/session/exchange", {
      method: "POST",
      headers: { Authorization: `Bearer ${legacyAdminToken}` },
    });
    legacyAdminToken = null;
  }
  const response = await request<{ admin: { id: string; name: string; email: string; role: string } }>("/api/admin/auth/me");
  window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify({ admin: response.admin }));
  return response;
}

export async function fetchStoreSettings() {
  const data = await request<{ settings: StoreSettings }>("/api/settings");
  return data.settings;
}

export async function saveStoreSettings(input: StoreSettings) {
  const data = await request<{ settings: StoreSettings }>("/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.settings;
}

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  } catch (_error) {
    throw new Error("Could not connect to the API on port 4000.");
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Upload failed");
  }

  return payload as T;
}

export async function fetchAdminProducts() {
  const data = await request<{ products: AdminProduct[] }>("/api/admin/products");
  return data.products;
}

export async function saveAdminProduct(input: Partial<AdminProduct> & { name: string }, id?: string) {
  if (id) {
    const data = await request<{ product: AdminProduct }>(`/api/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return data.product;
  }

  const data = await request<{ product: AdminProduct }>("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.product;
}

export async function deleteAdminProduct(id: string) {
  return request<{ ok: true }>(`/api/admin/products/${id}`, { method: "DELETE" });
}

export async function uploadAdminImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);
  const data = await uploadRequest<{ imageUrl: string }>("/api/admin/uploads", formData);
  return data.imageUrl;
}

export async function fetchAdminCategories() {
  return request<AdminCategory[]>("/api/categories");
}

export async function createAdminCategory(input: { name: string; description?: string }) {
  const data = await request<{ category: AdminCategory }>("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.category;
}

export async function updateAdminCategory(id: string, input: { name: string; description?: string }) {
  const data = await request<{ category: AdminCategory }>(`/api/admin/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.category;
}

export async function deleteAdminCategory(id: string) {
  return request<{ ok: true }>(`/api/admin/categories/${id}`, { method: "DELETE" });
}

export async function fetchAdminInquiries() {
  const data = await request<{ inquiries: AdminInquiry[] }>("/api/admin/inquiries");
  return data.inquiries;
}

export async function updateAdminInquiry(id: string, status: string) {
  const data = await request<{ inquiry: AdminInquiry }>(`/api/admin/inquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return data.inquiry;
}

export async function fetchAdminReviews() {
  const data = await request<{ reviews: AdminReview[] }>("/api/admin/reviews");
  return data.reviews;
}

export async function updateAdminReview(id: string, input: { status?: string; is_featured?: boolean }) {
  const data = await request<{ review: AdminReview }>(`/api/admin/reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.review;
}

export async function fetchAdminNotifications() {
  const data = await request<{ notifications: AdminNotification[] }>("/api/admin/notifications");
  return data.notifications;
}
