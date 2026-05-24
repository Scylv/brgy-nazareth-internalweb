import { apiFetch } from "../../../shared/api/client";

const validLuponCaseStatuses = ["open", "under_mediation", "resolved", "dismissed", "referred"];
const validLuponCasePriorities = ["low", "normal", "high", "urgent"];

function formatDateInputValue(date) {
  if (!date) {
    return "";
  }

  return String(date).slice(0, 10);
}

function normalizeLuponCaseStatus(status) {
  return validLuponCaseStatuses.includes(status) ? status : "open";
}

function normalizeLuponCasePriority(priority) {
  return validLuponCasePriorities.includes(priority) ? priority : "normal";
}

export function mapApiLuponCaseToLuponCase(apiCase = {}) {
  return {
    id: apiCase?.id ?? "",
    residentId: apiCase?.residentId ?? "",
    caseNumber: apiCase?.caseNumber ?? "",
    caseType: apiCase?.caseType ?? "",
    status: normalizeLuponCaseStatus(apiCase?.status),
    priority: normalizeLuponCasePriority(apiCase?.priority),
    confidentialSummary: apiCase?.confidentialSummary ?? "",
    openedAt: formatDateInputValue(apiCase?.openedAt),
    resolvedAt: formatDateInputValue(apiCase?.resolvedAt),
    assignedLuponProfileId: apiCase?.assignedLuponProfileId ?? "",
    createdByProfileId: apiCase?.createdByProfileId ?? "",
    createdAt: apiCase?.createdAt ?? "",
    updatedAt: apiCase?.updatedAt ?? ""
  };
}

export function mapApiLuponCasesResponse(data) {
  if (!Array.isArray(data?.luponCases)) {
    return [];
  }

  return data.luponCases
    .map(mapApiLuponCaseToLuponCase)
    .filter((luponCase) => luponCase.id && luponCase.residentId);
}

export async function fetchLuponCases() {
  const data = await apiFetch("/api/lupon/cases");

  return mapApiLuponCasesResponse(data);
}
