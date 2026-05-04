import { canManageUsers } from "../lib/permissions";
import NavButton from "./NavButton";

export default function AppNavigation({
  currentPage,
  role,
  hasSelectedResident,
  onOpenDepartment,
  onOpenVerification,
  onOpenLupon,
  onOpenRecordForm,
  onOpenAdmin
}) {
  return (
    <>
      {role === "department" ? (
        <NavButton active={currentPage === "department"} onClick={onOpenDepartment}>
          Dashboard
        </NavButton>
      ) : null}

      {role === "department" && hasSelectedResident ? (
        <NavButton active={currentPage === "verification"} onClick={onOpenVerification}>
          Verification
        </NavButton>
      ) : null}

      {role === "lupon" ? (
        <>
          <NavButton active={currentPage === "lupon"} onClick={onOpenLupon}>
            Dashboard
          </NavButton>
          <NavButton active={currentPage === "form"} onClick={onOpenRecordForm}>
            Record Form
          </NavButton>
        </>
      ) : null}

      {canManageUsers(role) ? (
        <NavButton active={currentPage === "admin"} onClick={onOpenAdmin}>
          Admin
        </NavButton>
      ) : null}
    </>
  );
}
