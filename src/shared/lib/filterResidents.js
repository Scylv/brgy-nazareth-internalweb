export const RESIDENT_STATUS_FILTERS = ["all", "green", "yellow", "red"];

export function normalizeResidentStatusFilter(statusFilter) {
  return RESIDENT_STATUS_FILTERS.includes(statusFilter) ? statusFilter : "all";
}

export function searchResidents(query, residentList) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return residentList;
  }

  return residentList.filter((resident) => {
    const haystack = [resident.name, resident.id, resident.householdId]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function filterResidentsByStatus(statusFilter, residentList) {
  const normalizedStatusFilter = normalizeResidentStatusFilter(statusFilter);

  if (normalizedStatusFilter === "all") {
    return residentList;
  }

  return residentList.filter((resident) => resident.status === normalizedStatusFilter);
}

export function filterResidents({ query = "", statusFilter = "all", residents = [] }) {
  return filterResidentsByStatus(statusFilter, searchResidents(query, residents));
}
