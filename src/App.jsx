import { useEffect, useMemo, useState } from "react";
import { documentRequests as initialDocumentRequests } from "./data/documentRequests";
import { residents as initialResidents } from "./data/residents";
import { users } from "./data/users";
import AdminPanel from "./features/admin/components/AdminPanel";
import LoginScreen from "./features/auth/components/LoginScreen";
import { findUser } from "./features/auth/lib/findUser";
import DepartmentDashboard from "./features/department/components/DepartmentDashboard";
import LuponDashboard from "./features/lupon/components/LuponDashboard";
import { fetchResidents } from "./features/residents/api/residentsApi";
import ResidentRecordForm from "./features/residents/components/ResidentRecordForm";
import ResidentVerification from "./features/residents/components/ResidentVerification";
import { cloneResident } from "./features/residents/lib/cloneResident";
import { createBlankResident } from "./features/residents/lib/createBlankResident";
import { validateResidentForm } from "./features/residents/lib/validateResidentForm";
import AppNavigation from "./shared/components/AppNavigation";
import AppShell from "./shared/components/AppShell";
import { filterResidents } from "./shared/lib/filterResidents";
import { canAddRecord, canEditRecord } from "./shared/lib/permissions";
import { pageCopy } from "./shared/lib/pageCopy";

const defaultResident = initialResidents[0];

function toDepartmentResident(resident) {
  return {
    id: resident.id,
    householdId: resident.householdId,
    name: resident.name,
    birthDate: resident.birthDate,
    civilStatus: resident.civilStatus,
    address: resident.address,
    status: resident.status
  };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [residentList, setResidentList] = useState(initialResidents);
  const [databaseResidentList, setDatabaseResidentList] = useState([]);
  const [isDepartmentResidentsLoading, setIsDepartmentResidentsLoading] = useState(true);
  const [departmentResidentsError, setDepartmentResidentsError] = useState("");
  const [documentRequestList, setDocumentRequestList] = useState(initialDocumentRequests);
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState("");
  const [departmentStatusFilter, setDepartmentStatusFilter] = useState("all");
  const [luponSearchQuery, setLuponSearchQuery] = useState("");
  const [luponStatusFilter, setLuponStatusFilter] = useState("all");
  const [selectedResidentId, setSelectedResidentId] = useState(defaultResident.id);
  const [currentPage, setCurrentPage] = useState("login");
  const [formMode, setFormMode] = useState("edit");
  const [formData, setFormData] = useState(cloneResident(defaultResident));
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    let isActive = true;

    async function loadDepartmentResidents() {
      setIsDepartmentResidentsLoading(true);
      setDepartmentResidentsError("");

      try {
        const residents = await fetchResidents();

        if (!isActive) {
          return;
        }

        setDatabaseResidentList(residents);
      } catch (_error) {
        if (!isActive) {
          return;
        }

        setDatabaseResidentList([]);
        setDepartmentResidentsError(
          "Resident database API is unavailable. Start the backend with npm run dev:server, then refresh."
        );
      } finally {
        if (isActive) {
          setIsDepartmentResidentsLoading(false);
        }
      }
    }

    loadDepartmentResidents();

    return () => {
      isActive = false;
    };
  }, []);

  const departmentResidentRecords = useMemo(
    () => databaseResidentList.map(toDepartmentResident),
    [databaseResidentList]
  );

  const departmentResidents = useMemo(
    () =>
      filterResidents({
        query: departmentSearchQuery,
        statusFilter: departmentStatusFilter,
        residents: departmentResidentRecords
      }),
    [departmentSearchQuery, departmentResidentRecords, departmentStatusFilter]
  );

  const luponResidents = useMemo(
    () =>
      filterResidents({
        query: luponSearchQuery,
        statusFilter: luponStatusFilter,
        residents: residentList
      }),
    [luponSearchQuery, luponStatusFilter, residentList]
  );

  const selectedResident =
    residentList.find((resident) => resident.id === selectedResidentId) ?? residentList[0];
  const selectedDepartmentResident =
    departmentResidentRecords.find((resident) => resident.id === selectedResidentId) ??
    departmentResidentRecords[0] ??
    null;
  const localDepartmentResidents = residentList.map(toDepartmentResident);

  function createDocumentRequestId(requests) {
    const nextNumber =
      requests.reduce((highest, request) => {
        const requestNumber = Number(request.id.replace("DOC-2026-", ""));
        return Number.isNaN(requestNumber) ? highest : Math.max(highest, requestNumber);
      }, 0) + 1;

    return `DOC-2026-${String(nextNumber).padStart(4, "0")}`;
  }

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
    setFormMode("edit");
    setFormData(cloneResident(defaultResident));
    setCurrentPage(getLandingPage(user.role));
  }

  function handleLogout() {
    setCurrentUser(null);
    setCurrentPage("login");
    setLoginError("");
    setDepartmentSearchQuery("");
    setDepartmentStatusFilter("all");
    setLuponSearchQuery("");
    setLuponStatusFilter("all");
    setFormErrors({});
    setSelectedResidentId(defaultResident.id);
    setFormMode("edit");
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
    setFormMode("edit");
    setFormData(cloneResident(resident));
    setFormErrors({});
    setCurrentPage("form");
  }

  function openNewResidentForm() {
    if (!canAddRecord(currentUser.role)) {
      return;
    }

    const newResident = createBlankResident(residentList);
    setSelectedResidentId(newResident.id);
    setFormMode("add");
    setFormData(newResident);
    setFormErrors({});
    setCurrentPage("form");
  }

  function closeResidentForm() {
    setFormErrors({});
    setFormMode("edit");
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

      if (name === "registeredVoter") {
        return {
          ...current,
          registeredVoter: checked,
          precinctNumber: checked ? current.precinctNumber : "",
          sectors: checked
            ? Array.from(new Set([...current.sectors, "Registered Voter"]))
            : current.sectors.filter((sector) => sector !== "Registered Voter")
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

    const savedResident = cloneResident(formData);
    setResidentList((current) =>
      formMode === "add"
        ? [...current, savedResident]
        : current.map((resident) => (resident.id === selectedResidentId ? savedResident : resident))
    );
    setSelectedResidentId(formData.id);
    setFormMode("edit");
    setFormErrors({});
    setCurrentPage("lupon");
  }

  function handleDocumentRequestSave(request) {
    setDocumentRequestList((current) => {
      if (request.id) {
        return current.map((item) => (item.id === request.id ? request : item));
      }

      return [
        {
          ...request,
          id: createDocumentRequestId(current)
        },
        ...current
      ];
    });
  }

  if (!currentUser) {
    return <LoginScreen error={loginError} onLogin={handleLogin} users={users} />;
  }

  const actions = (
    <AppNavigation
      currentPage={currentPage}
      hasSelectedResident={
        currentUser.role === "department" ? Boolean(selectedDepartmentResident) : Boolean(selectedResident)
      }
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
          documentRequests={documentRequestList}
          onDocumentRequestSave={handleDocumentRequestSave}
          onQueryChange={setDepartmentSearchQuery}
          onSelectResident={openResidentVerification}
          onStatusFilterChange={setDepartmentStatusFilter}
          query={departmentSearchQuery}
          residentDataSource="Database API"
          residentError={departmentResidentsError}
          residents={localDepartmentResidents}
          residentSearchResidents={departmentResidentRecords}
          results={departmentResidents}
          isResidentLoading={isDepartmentResidentsLoading}
          statusFilter={departmentStatusFilter}
        />
      ) : null}

      {currentPage === "verification" && selectedDepartmentResident ? (
        <ResidentVerification
          documentRequests={documentRequestList}
          onBack={() => setCurrentPage("department")}
          resident={selectedDepartmentResident}
        />
      ) : null}

      {currentPage === "verification" && !selectedDepartmentResident ? (
        <section className="rounded-[1.75rem] border border-orange-100 bg-white p-6 text-sm text-slate-600">
          Resident database data is not loaded yet. Return to the Department dashboard and try again
          after the backend API is available.
        </section>
      ) : null}

      {currentPage === "lupon" ? (
        <LuponDashboard
          documentRequests={documentRequestList}
          onQueryChange={setLuponSearchQuery}
          onAddResident={openNewResidentForm}
          onOpenForm={openResidentForm}
          onSelectResident={setSelectedResidentId}
          onStatusFilterChange={setLuponStatusFilter}
          query={luponSearchQuery}
          residents={luponResidents}
          selectedResident={selectedResident}
          selectedResidentId={selectedResidentId}
          statusFilter={luponStatusFilter}
        />
      ) : null}

      {currentPage === "form" && canEditRecord(currentUser.role) ? (
        <ResidentRecordForm
          errors={formErrors}
          formData={formData}
          mode={formMode}
          onCancel={closeResidentForm}
          onChange={handleFormChange}
          onDocumentInputChange={handleDocumentInputChange}
          onSave={handleFormSave}
        />
      ) : null}

      {currentPage === "admin" ? (
        <AdminPanel
          documentRequests={documentRequestList}
          residents={residentList}
          users={users}
        />
      ) : null}
    </AppShell>
  );
}
