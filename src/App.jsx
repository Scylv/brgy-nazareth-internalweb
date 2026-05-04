import { useMemo, useState } from "react";
import { residents as initialResidents } from "./data/residents";
import { users } from "./data/users";
import AdminPanel from "./features/admin/components/AdminPanel";
import LoginScreen from "./features/auth/components/LoginScreen";
import { findUser } from "./features/auth/lib/findUser";
import DepartmentDashboard from "./features/department/components/DepartmentDashboard";
import LuponDashboard from "./features/lupon/components/LuponDashboard";
import ResidentRecordForm from "./features/residents/components/ResidentRecordForm";
import ResidentVerification from "./features/residents/components/ResidentVerification";
import { cloneResident } from "./features/residents/lib/cloneResident";
import { searchResident } from "./features/residents/lib/searchResident";
import { validateResidentForm } from "./features/residents/lib/validateResidentForm";
import AppNavigation from "./shared/components/AppNavigation";
import AppShell from "./shared/components/AppShell";
import { canEditRecord } from "./shared/lib/permissions";
import { pageCopy } from "./shared/lib/pageCopy";

const defaultResident = initialResidents[0];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [residentList, setResidentList] = useState(initialResidents);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResidentId, setSelectedResidentId] = useState(defaultResident.id);
  const [currentPage, setCurrentPage] = useState("login");
  const [formData, setFormData] = useState(cloneResident(defaultResident));
  const [formErrors, setFormErrors] = useState({});

  const filteredResidents = useMemo(
    () => searchResident(searchQuery, residentList),
    [searchQuery, residentList]
  );

  const selectedResident =
    residentList.find((resident) => resident.id === selectedResidentId) ?? residentList[0];

  function getLandingPage(role) {
    if (role === "department") {
      return "department";
    }

    if (role === "lupon") {
      return "lupon";
    }

    return "admin";
  }

  function handleLogin(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const user = findUser(form.get("username") ?? "", form.get("password") ?? "", users);

    if (!user) {
      setLoginError("Invalid credentials. Use one of the local accounts shown on the login screen.");
      return;
    }

    setCurrentUser(user);
    setLoginError("");
    setSelectedResidentId(defaultResident.id);
    setFormData(cloneResident(defaultResident));
    setCurrentPage(getLandingPage(user.role));
  }

  function handleLogout() {
    setCurrentUser(null);
    setCurrentPage("login");
    setLoginError("");
    setSearchQuery("");
    setFormErrors({});
    setSelectedResidentId(defaultResident.id);
    setFormData(cloneResident(defaultResident));
  }

  function openResidentVerification(residentId) {
    setSelectedResidentId(residentId);
    setCurrentPage("verification");
  }

  function openResidentForm(residentId) {
    const resident = residentList.find((item) => item.id === residentId);
    if (!resident) {
      return;
    }

    setSelectedResidentId(residentId);
    setFormData(cloneResident(resident));
    setFormErrors({});
    setCurrentPage("form");
  }

  function closeResidentForm() {
    setFormErrors({});
    setCurrentPage("lupon");
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((current) => {
      if (name === "sectors") {
        return {
          ...current,
          sectors: checked
            ? [...current.sectors, value]
            : current.sectors.filter((sector) => sector !== value)
        };
      }

      return {
        ...current,
        [name]: type === "checkbox" ? checked : value
      };
    });
  }

  function handleDocumentInputChange(event) {
    const documents = event.target.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setFormData((current) => ({
      ...current,
      documents
    }));
  }

  function handleFormSave(event) {
    event.preventDefault();

    const validation = validateResidentForm(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setResidentList((current) =>
      current.map((resident) => (resident.id === selectedResidentId ? cloneResident(formData) : resident))
    );
    setSelectedResidentId(formData.id);
    setFormErrors({});
    setCurrentPage("lupon");
  }

  if (!currentUser) {
    return <LoginScreen error={loginError} onLogin={handleLogin} users={users} />;
  }

  const actions = (
    <AppNavigation
      currentPage={currentPage}
      hasSelectedResident={Boolean(selectedResident)}
      onOpenAdmin={() => setCurrentPage("admin")}
      onOpenDepartment={() => setCurrentPage("department")}
      onOpenLupon={() => setCurrentPage("lupon")}
      onOpenRecordForm={() => openResidentForm(selectedResidentId)}
      onOpenVerification={() => setCurrentPage("verification")}
      role={currentUser.role}
    />
  );

  return (
    <AppShell
      actions={actions}
      onLogout={handleLogout}
      subtitle={pageCopy[currentPage].subtitle}
      title={pageCopy[currentPage].title}
      user={currentUser}
    >
      {currentPage === "department" ? (
        <DepartmentDashboard
          onQueryChange={setSearchQuery}
          onSelectResident={openResidentVerification}
          query={searchQuery}
          results={filteredResidents}
        />
      ) : null}

      {currentPage === "verification" ? (
        <ResidentVerification
          onBack={() => setCurrentPage("department")}
          resident={selectedResident}
        />
      ) : null}

      {currentPage === "lupon" ? (
        <LuponDashboard
          onOpenForm={openResidentForm}
          onSelectResident={setSelectedResidentId}
          residents={residentList}
          selectedResidentId={selectedResidentId}
        />
      ) : null}

      {currentPage === "form" && canEditRecord(currentUser.role) ? (
        <ResidentRecordForm
          errors={formErrors}
          formData={formData}
          onCancel={closeResidentForm}
          onChange={handleFormChange}
          onDocumentInputChange={handleDocumentInputChange}
          onSave={handleFormSave}
        />
      ) : null}

      {currentPage === "admin" ? <AdminPanel /> : null}
    </AppShell>
  );
}
