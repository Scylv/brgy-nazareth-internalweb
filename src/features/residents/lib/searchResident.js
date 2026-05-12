import { searchResidents } from "../../../shared/lib/filterResidents";

export function searchResident(query, residentList) {
  const normalizedQuery = (query || "").trim();
  
  return searchResidents(query, residentList);
}
