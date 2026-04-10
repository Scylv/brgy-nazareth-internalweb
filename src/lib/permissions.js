export function canEditRecord(role) {
  return role === "lupon";
}

export function canManageUsers(role) {
  return role === "admin";
}
