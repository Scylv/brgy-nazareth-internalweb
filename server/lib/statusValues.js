export const RESIDENT_STATUS_VALUES = ["green", "yellow", "red"];

export const DOCUMENT_REQUEST_STATUS_VALUES = [
  "pending",
  "processing",
  "released",
  "cancelled",
  "expired"
];

export const LUPON_CASE_STATUS_VALUES = [
  "open",
  "under_mediation",
  "resolved",
  "dismissed",
  "referred"
];

export const LUPON_CASE_PRIORITY_VALUES = ["low", "normal", "high", "urgent"];

export const LUPON_NOTE_TYPE_VALUES = ["internal", "hearing", "follow_up", "resolution"];

export function isAllowedValue(value, allowedValues) {
  return allowedValues.includes(value);
}
