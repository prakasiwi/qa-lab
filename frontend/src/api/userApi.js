import { api } from "./apiClient";
export const getUsers = (params, config = {}) =>
  api.get("/users", { ...config, params });
export const getUser = (id) => api.get(`/users/${id}`);
export const getAccessOptions = () => api.get("/users/access-options");
export const createUser = (payload) => api.post("/users", payload);
export const updateUser = (id, payload) => api.patch(`/users/${id}`, payload);
export const updateUserStatus = (id, status) =>
  api.patch(`/users/${id}/status`, { status });
export const resendUserInvitation = (id) =>
  api.post(`/users/${id}/resend-invitation`);
export const resendUserVerification = (id) =>
  api.post(`/users/${id}/resend-verification`);
export const getUserSessions = (id) => api.get(`/users/${id}/sessions`);
export const revokeUserSession = (id, sessionId) =>
  api.delete(`/users/${id}/sessions/${sessionId}`);
