import axios from "axios";
import { clearSession, getSession } from "./authStorage";

export const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8002";

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearSession();
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = "Something went wrong") {
  if (error?.response?.status === 404) {
    return `Cannot reach the API at ${API}. Start the backend and set VITE_API_URL in frontend/.env to the same port as uvicorn.`;
  }
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return fallback;
}

export async function validateSession() {
  const session = getSession();
  if (!session?.token) return null;

  try {
    const res = await api.get("/auth/me");
    const data = res.data;

    if (data.role === "employee") {
      return {
        role: "employee",
        id: data.id,
        name: data.name,
        email: data.email,
        token: session.token,
      };
    }

    return {
      role: "company",
      company: data.company,
      email: data.email,
      token: session.token,
    };
  } catch {
    clearSession();
    return null;
  }
}
