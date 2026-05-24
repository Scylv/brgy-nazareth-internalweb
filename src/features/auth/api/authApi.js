import { apiFetch } from "../../../shared/api/client";

export async function loginUser({ username, password }) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  return data.user;
}

export async function fetchCurrentUser() {
  const data = await apiFetch("/api/auth/me");

  return data.user;
}

export async function logoutUser() {
  await apiFetch("/api/auth/logout", {
    method: "POST"
  });
}
