/**
 * API Client — replaces base44 SDK with direct HTTPS calls to your Node backend.
 * Set VITE_API_URL in your .env file, e.g. VITE_API_URL=https://localhost:4000
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ─── Token Management ────────────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem("auth_token");
}

export function setToken(token) {
  localStorage.setItem("auth_token", token);
}

export function removeToken() {
  localStorage.removeItem("auth_token");
}

// ─── HTTP Core ────────────────────────────────────────────────────────────────

async function request(method, path, body = null) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const error = new Error(err.message || "Request failed");
    error.status = res.status;
    throw error;
  }

  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  /** Register a new user. Returns { token, user } */
  register: (data) => api.post("/api/auth/register", data),

  /** Login. Returns { token, user } */
  login: (data) => api.post("/api/auth/login", data),

  /** Get current user profile */
  me: () => api.get("/api/auth/me"),

  /** Update current user profile */
  updateMe: (data) => api.patch("/api/auth/me", data),

  logout: (redirectUrl) => {
    removeToken();
    window.location.href = redirectUrl || "/login";
  },

  redirectToLogin: (nextUrl) => {
    const next = nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : "";
    window.location.href = `/login${next}`;
  },

  isAuthenticated: () => !!getToken(),
};

// ─── Generic Entity CRUD factory ──────────────────────────────────────────────

function entityClient(entityPath) {
  return {
    /** List all records. Optional sort string and limit. */
    list: (sort, limit) => {
      const params = new URLSearchParams();
      if (sort) params.set("sort", sort);
      if (limit) params.set("limit", limit);
      const qs = params.toString();
      return api.get(`${entityPath}${qs ? "?" + qs : ""}`);
    },

    /** Filter by field=value pairs */
    filter: (filters, sort, limit) => {
      const params = new URLSearchParams(filters);
      if (sort) params.set("sort", sort);
      if (limit) params.set("limit", limit);
      return api.get(`${entityPath}?${params.toString()}`);
    },

    /** Get single record by ID */
    get: (id) => api.get(`${entityPath}/${id}`),

    /** Create a new record */
    create: (data) => api.post(entityPath, data),

    /** Bulk create records */
    bulkCreate: (records) => api.post(`${entityPath}/bulk`, { records }),

    /** Update a record by ID */
    update: (id, data) => api.patch(`${entityPath}/${id}`, data),

    /** Delete a record by ID */
    delete: (id) => api.delete(`${entityPath}/${id}`),
  };
}

// ─── Entities ─────────────────────────────────────────────────────────────────

export const entities = {
  Class: entityClient("/api/classes"),
  ClassMembership: entityClient("/api/memberships"),
  Exam: entityClient("/api/exams"),
  Word: entityClient("/api/words"),
  User: entityClient("/api/users"),
};

// ─── File Upload (for ExcelImportDialog) ─────────────────────────────────────

export const integrations = {
  Core: {
    UploadFile: async ({ file }) => {
      const token = getToken();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BASE_URL}/api/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json(); // { file_url }
    },

    ExtractDataFromUploadedFile: (data) =>
      api.post("/api/extract", data),
  },
};

// ─── Default export (mirrors base44 shape used across the app) ────────────────

export const apiClient = { auth, entities, integrations };