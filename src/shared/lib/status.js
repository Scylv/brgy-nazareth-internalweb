const STATUS_MAP = {
  green: {
    label: "Green",
    summary: "Cleared - proceed",
    action: "Cleared - proceed",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200"
  },
  yellow: {
    label: "Yellow",
    summary: "Needs Lupon review",
    action: "Needs Lupon review",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200"
  },
  red: {
    label: "Red",
    summary: "Hold - Lupon required",
    action: "Hold - Lupon required",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200"
  }
};

export function getStatusMeta(status) {
  return STATUS_MAP[status] ?? STATUS_MAP.red;
}

export function getStatusAction(status) {
  return getStatusMeta(status).action;
}
