import api from "./apiClient";
import { googleAuthProvider } from "@/auth/providers/emergentGoogle";

/** Provider-independent authentication service consumed by AuthProvider and all modules. */
export const authService = {
  me: () => api.get("/auth/me").then((r) => r.data),
  login: (email, password) => api.post("/auth/login", { email, password }).then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
  requestEmailVerification: (email) => api.post("/auth/verify-email/request", { email }).then((r) => r.data),
  confirmEmailVerification: (token) => api.get("/auth/verify-email/confirm", { params: { token } }).then((r) => r.data),
  register: (payload) => api.post("/auth/register", payload).then((r) => r.data),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token, password) => api.post("/auth/reset-password", { token, password }).then((r) => r.data),
  updateProfile: (payload) => api.put("/auth/me", payload).then((r) => r.data),

  startGoogleLogin: () => googleAuthProvider.start(),
  extractGoogleSessionId: (hash) => googleAuthProvider.extractSessionId(hash),
  exchangeGoogleSession: (sessionId) => api.post("/auth/google/session", { session_id: sessionId }).then((r) => r.data),
};
