const luponCaseStatusLabels = {
  open: "Open",
  under_mediation: "Under Mediation",
  resolved: "Resolved",
  dismissed: "Dismissed",
  referred: "Referred"
};

function getCaseDateValue(luponCase) {
  const timestamp = Date.parse(luponCase.openedAt || luponCase.createdAt || "");

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatCaseLine(luponCase) {
  const caseType = luponCase.caseType || "Lupon Case";

  if (!luponCase.caseNumber) {
    return caseType;
  }

  return `${caseType} (${luponCase.caseNumber})`;
}

export function getLuponCasesForResident(residentId, luponCases = []) {
  if (!residentId || !Array.isArray(luponCases)) {
    return [];
  }

  return luponCases
    .filter((luponCase) => luponCase.residentId === residentId)
    .sort((left, right) => getCaseDateValue(right) - getCaseDateValue(left));
}

export function getResidentLuponCaseDisplay(resident, luponCases = []) {
  const [latestCase] = getLuponCasesForResident(resident?.id, luponCases);

  if (!latestCase) {
    return {
      caseLine: "No active Lupon case",
      statusLabel: "",
      summary: "No confidential case summary"
    };
  }

  return {
    caseLine: formatCaseLine(latestCase),
    statusLabel: luponCaseStatusLabels[latestCase.status] ?? "Open",
    summary: latestCase.confidentialSummary || "No confidential case summary"
  };
}
