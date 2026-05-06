export const ACCOUNT_ROLE_ORDER = ["admin", "department", "lupon"];

export const accountRoleLabels = {
  admin: "Admin",
  department: "Department",
  lupon: "Lupon"
};

export function getAccountGroups(users) {
  return ACCOUNT_ROLE_ORDER.map((role) => {
    const accounts = users.filter((user) => user.role === role);

    return {
      role,
      label: accountRoleLabels[role],
      count: accounts.length,
      accounts
    };
  });
}

export function getAdminCounters({ users, residents, documentRequests }) {
  return {
    totalResidents: residents.length,
    totalDepartmentAccounts: users.filter((user) => user.role === "department").length,
    totalLuponAccounts: users.filter((user) => user.role === "lupon").length,
    totalDocumentRequests: documentRequests.length
  };
}
