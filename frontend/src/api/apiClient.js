import axios from "axios";
import { shouldInvalidateAuth } from "./authInvalidation";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (!apiBaseUrl) {
  // Vite exposes VITE_* variables at build time. Configure VITE_API_BASE_URL
  // in frontend/.env for local development and in Vercel Environment Variables
  // for Preview/Production deployments.
  console.error("VITE_API_BASE_URL belum dikonfigurasi.");
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

api.interceptors.response.use(undefined, (error) => {
  if (shouldInvalidateAuth(error)) {
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }
  return Promise.reject(error);
});

export function apiUrl(path) {
  return new URL(
    path.replace(/^\//, ""),
    `${apiBaseUrl.replace(/\/$/, "")}/`,
  ).toString();
}
