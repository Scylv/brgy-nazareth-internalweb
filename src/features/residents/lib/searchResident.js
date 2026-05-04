import { searchResidents } from "../../../shared/lib/filterResidents";

export function searchResident(query, residentList) {
  return searchResidents(query, residentList);
}
