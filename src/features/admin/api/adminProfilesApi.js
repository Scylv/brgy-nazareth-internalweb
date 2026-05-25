import { apiFetch } from "../../../shared/api/client";

export function mapApiProfileToAccount(apiProfile) {
  return {
    id: apiProfile.id,
    username: apiProfile.username,
    name: apiProfile.displayName ?? apiProfile.name ?? "",
    displayName: apiProfile.displayName ?? apiProfile.name ?? "",
    role: apiProfile.role,
    status: apiProfile.status,
    createdAt: apiProfile.createdAt,
    updatedAt: apiProfile.updatedAt
  };
}

export async function fetchAdminProfiles() {
  const data = await apiFetch("/api/admin/profiles");

  return (data.profiles ?? []).map(mapApiProfileToAccount);
}

export async function createAdminProfile({ username, displayName, role, temporaryPassword }) {
  const data = await apiFetch("/api/admin/profiles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, displayName, role, temporaryPassword })
  });

  return mapApiProfileToAccount(data.profile);
}

export async function updateAdminProfileStatus(profileId, status) {
  const data = await apiFetch(`/api/admin/profiles/${profileId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });

  return mapApiProfileToAccount(data.profile);
}

export async function resetAdminProfilePassword(profileId, temporaryPassword) {
  const data = await apiFetch(`/api/admin/profiles/${profileId}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ temporaryPassword })
  });

  return mapApiProfileToAccount(data.profile);
}
