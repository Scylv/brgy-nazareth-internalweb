import { useMemo, useState } from "react";
import AppShell from "./components/AppShell";
import AdminPlaceholder from "./components/AdminPlaceholder";
import DepartmentDashboard from "./components/DepartmentDashboard";
import LoginScreen from "./components/LoginScreen";
import LuponDashboard from "./components/LuponDashboard";
import ResidentRecordForm from "./components/ResidentRecordForm";
import ResidentVerification from "./components/ResidentVerification";
import { residents as initialResidents } from "./data/residents";
import { users } from "./data/users";
import { canEditRecord, canManageUsers } from "./lib/permissions";
import { searchResident } from "./lib/searchResident";
import { validateResidentForm } from "./lib/validateResidentForm";

const pageCopy = {
  department: {
    title: "Department Office Dashboard",
    subtitle:
      "Search residents and view limited status results only. Confidential Lupon details stay hidden from this role."
  },
  verification: {
    title: "Resident Verification",
    subtitle:
      "Minimal verification result for clearance handling. Yellow and red outcomes both require referral to the Lupon office."
  },
  lupon: {
    title: "Lupon Dashboard",
    subtitle:
      "Lupon Staff can review internal records, edit status, update remarks, and maintain the basic resident registry form."
  },
  form: {
    title: "Resident Record Form",
    subtitle:
      "Basic grouped resident form for Lupon Staff. This is a local mock-data editor only."
  },
  admin: {
    title: "Admin Screen",
    subtitle:
      "Simple placeholder for role and user management, kept intentionally small for the prototype."
  }
};

function findUser(username, password) {
  return users.find(
    (user) => user.username === username.trim().toLowerCase() && user.password === password
  );
}

function cloneResident(resident) {
  return {
    ...resident,
    sectors: [...resident.sectors],
    documents: [...resident.documents]
  };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [residentList, setResidentList] = useState(initialResidents);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResidentId, setSelectedResidentId] = useState(initialResidents[0].id);
  const [currentPage, setCurrentPage] = useState("login");
  const [formData, setFormData] = useState(cloneResident(initialResidents[0]));
  const [formErrors, setFormErrors] = useState({});

  const filteredResidents = useMemo(
    () => searchResident(searchQuery, residentList),
    [searchQuery, residentList]
  );

  const selectedResident =
    residentList.find((resident) => resident.id === selectedResidentId) ?? residentList[0];

  function handleLogin(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const user = findUser(form.get("username") ?? "", form.get("password") ?? "");

    if (!user) {
      setLoginError("Invalid demo credentials. Use one of the accounts shown on the login screen.");
      return;
    }

    setCurrentUser(user);
    setLoginError("");
    setSelectedResidentId(initialResidents[0].id);
    setFormData(cloneResident(initialResidents[0]));

    if (user.role === "department") {
      setCurrentPage("department");
      return;
    }

    if (user.role === "lupon") {
      setCurrentPage("lupon");
      return;
    }

    setCurrentPage("admin");
  }

  function handleLogout() {
    setCurrentUser(null);
    setCurrentPage("login");
    setLoginError("");
    setSearchQuery("");
    setFormErrors({});
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
    <>
      {currentUser.role === "department" ? (
        <button
          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            currentPage === "department"
              ? "bg-gov-700 text-white"
              : "border border-orange-100 bg-orange-50 text-gov-800"
          }`}
          onClick={() => setCurrentPage("department")}
          type="button"
        >
          Dashboard
        </button>
      ) : null}

      {currentUser.role === "department" && selectedResident ? (
        <button
          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            currentPage === "verification"
              ? "bg-gov-700 text-white"
              : "border border-orange-100 bg-orange-50 text-gov-800"
          }`}
          onClick={() => setCurrentPage("verification")}
          type="button"
        >
          Verification
        </button>
      ) : null}

      {currentUser.role === "lupon" ? (
        <>
          <button
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              currentPage === "lupon"
                ? "bg-gov-700 text-white"
                : "border border-orange-100 bg-orange-50 text-gov-800"
            }`}
            onClick={() => setCurrentPage("lupon")}
            type="button"
          >
            Dashboard
          </button>
          <button
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              currentPage === "form"
                ? "bg-gov-700 text-white"
                : "border border-orange-100 bg-orange-50 text-gov-800"
            }`}
            onClick={() => openResidentForm(selectedResidentId)}
            type="button"
          >
            Record Form
          </button>
        </>
      ) : null}

      {canManageUsers(currentUser.role) ? (
        <button
          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            currentPage === "admin"
              ? "bg-gov-700 text-white"
              : "border border-orange-100 bg-orange-50 text-gov-800"
          }`}
          onClick={() => setCurrentPage("admin")}
          type="button"
        >
          Admin
        </button>
      ) : null}
    </>
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
          onCancel={() => setCurrentPage("lupon")}
          onChange={handleFormChange}
          onDocumentInputChange={handleDocumentInputChange}
          onSave={handleFormSave}
        />
      ) : null}

      {currentPage === "admin" ? <AdminPlaceholder /> : null}
    </AppShell>
  );
}
