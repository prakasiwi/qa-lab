import { api } from "./apiClient";

const publicRequest = { skipAuthInvalidation: true };
export const login = (payload) =>
  api.post("/auth/login", payload, publicRequest);
export const verifyMfa = (payload) =>
  api.post("/auth/mfa/verify", payload, publicRequest);
export const resendMfa = (payload) =>
  api.post("/auth/mfa/resend", payload, publicRequest);
export const selectRole = (payload) =>
  api.post("/auth/select-role", payload, publicRequest);
export const profile = () => api.get("/auth/profile");
export const logout = () => api.post("/auth/logout", undefined, publicRequest);
export const roles = () => api.get("/auth/roles");
export const switchRole = (payload) => api.post("/auth/switch-role", payload);
export const register = (payload) =>
  api.post("/auth/register", payload, publicRequest);
export const verifyIdentifier = (payload) =>
  api.post("/auth/verify-identifier", payload, publicRequest);
export const resendVerification = (payload) =>
  api.post("/auth/resend-verification", payload, publicRequest);
export const activationContext = (token) =>
  api.get("/auth/activation-context", { ...publicRequest, params: { token } });
export const activateAccount = (payload) =>
  api.post("/auth/activate-account", payload, publicRequest);
export const forgotPassword = (payload) =>
  api.post("/auth/forgot-password", payload, publicRequest);
export const resendResetPassword = (payload) =>
  api.post("/auth/resend-reset-password", payload, publicRequest);
export const resetContext = (token) =>
  api.get("/auth/reset-context", { ...publicRequest, params: { token } });
export const resetPassword = (payload) =>
  api.post("/auth/reset-password", payload, publicRequest);
