import { api } from "./apiClient";

export const getPermissions = (params, config = {}) =>
  api.get("/permissions", { ...config, params });
export const getPermission = (id) => api.get(`/permissions/${id}`);
export const getPermissionActionCatalog = () =>
  api.get("/permissions/action-catalog");
export const createPermission = (payload) => api.post("/permissions", payload);
export const updatePermission = (id, payload) =>
  api.patch(`/permissions/${id}`, payload);
