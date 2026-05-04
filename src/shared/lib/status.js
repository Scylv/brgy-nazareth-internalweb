const STATUS_MAP = {
  green: {
    label: "Green",
    summary: "Cleared",
    action: "Proceed with clearance",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200"
  },
  yellow: {
    label: "Yellow",
    summary: "For Review",
    action: "Refer to Lupon office",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200"
  },
  red: {
    label: "Red",
    summary: "Refer to Lupon",
    action: "Refer to Lupon office",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200"
  }
};

export function getStatusMeta(status) {
  return STATUS_MAP[status] ?? STATUS_MAP.red;
}

export function getStatusAction(status) {
  return getStatusMeta(status).action;
}
