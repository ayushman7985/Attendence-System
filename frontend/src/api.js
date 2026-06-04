import axios from "axios";

export const API = "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export function getErrorMessage(error, fallback = "Something went wrong") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return fallback;
}
