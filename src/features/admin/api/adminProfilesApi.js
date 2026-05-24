import { apiFetch } from "../../../shared/api/client";

export function mapApiProfileToAccount(apiProfile) {
  return {
    id: apiProfile.id,
    username: apiProfile.username,
    name: apiProfile.displayName ?? apiProfile.name ?? "",
    displayName: apiProfile.displayName ?? apiProfile.name ?? "",
    role: apiProfile.role,
    createdAt: apiProfile.createdAt,
    updatedAt: apiProfile.updatedAt
  };
}

export async function fetchAdminProfiles() {
  const data = await apiFetch("/api/admin/profiles");

  return (data.profiles ?? []).map(mapApiProfileToAccount);
}
