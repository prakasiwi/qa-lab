import { api } from "./apiClient";

export const getRoles = (params, config = {}) =>
  api.get("/roles", { ...config, params });
export const getRole = (id) => api.get(`/roles/${id}`);
export const createRole = (payload) => api.post("/roles", payload);
export const updateRole = (id, payload) => api.patch(`/roles/${id}`, payload);
