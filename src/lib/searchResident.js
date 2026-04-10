export function searchResident(query, residentList) {
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
