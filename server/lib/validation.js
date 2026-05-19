import {
  DOCUMENT_REQUEST_STATUS_VALUES,
  LUPON_CASE_PRIORITY_VALUES,
  LUPON_CASE_STATUS_VALUES,
  LUPON_NOTE_TYPE_VALUES,
  isAllowedValue
} from "./statusValues.js";

export function requireFields(body, fields) {
  return fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
}

export function validateDocumentRequestStatus(status) {
  return isAllowedValue(status, DOCUMENT_REQUEST_STATUS_VALUES);
}

export function validateLuponCaseStatus(status) {
  return isAllowedValue(status, LUPON_CASE_STATUS_VALUES);
}

export function validateLuponCasePriority(priority) {
  return isAllowedValue(priority, LUPON_CASE_PRIORITY_VALUES);
}

export function validateLuponNoteType(noteType) {
  return isAllowedValue(noteType, LUPON_NOTE_TYPE_VALUES);
}
