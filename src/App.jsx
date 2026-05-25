import { useEffect, useMemo, useState } from "react";
import { residents as initialResidents } from "./data/residents";
import { users } from "./data/users";
import { fetchAdminProfiles } from "./features/admin/api/adminProfilesApi";
import AdminPanel from "./features/admin/components/AdminPanel";
import { fetchCurrentUser, loginUser, logoutUser } from "./features/auth/api/authApi";
import LoginScreen from "./features/auth/components/LoginScreen";
import {
  createDocumentRequest,
  fetchDocumentRequests
} from "./features/department/api/documentRequestsApi";
import DepartmentDashboard from "./features/department/components/DepartmentDashboard";
import { fetchLuponCases } from "./features/lupon/api/luponCasesApi";
import LuponDashboard from "./features/lupon/components/LuponDashboard";
import { fetchResidents, updateResident } from "./features/residents/api/residentsApi";
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
  const [residentList] = useState(initialResidents);
  const [databaseResidentList, setDatabaseResidentList] = useState([]);
  const [isDepartmentResidentsLoading, setIsDepartmentResidentsLoading] = useState(true);
  const [departmentResidentsError, setDepartmentResidentsError] = useState("");
  const [documentRequestList, setDocumentRequestList] = useState([]);
  const [adminProfileList, setAdminProfileList] = useState([]);
  const [isAdminProfilesLoading, setIsAdminProfilesLoading] = useState(false);
  const [adminProfilesError, setAdminProfilesError] = useState("");
  const [isDocumentRequestsLoading, setIsDocumentRequestsLoading] = useState(false);
  const [documentRequestsError, setDocumentRequestsError] = useState("");
  const [luponCaseList, setLuponCaseList] = useState([]);
  const [isLuponCasesLoading, setIsLuponCasesLoading] = useState(false);
  const [luponCasesError, setLuponCasesError] = useState("");
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

    async function loadCurrentUser() {
      try {
        const user = await fetchCurrentUser();

        if (!isActive) {
          return;
        }

        setCurrentUser(user);
        setCurrentPage(getLandingPage(user.role));
      } catch (_error) {
        if (isActive) {
          setCurrentUser(null);
        }
      }
    }

    loadCurrentUser();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!currentUser || !["department", "lupon"].includes(currentUser.role)) {
      setDatabaseResidentList([]);
      setIsDepartmentResidentsLoading(false);
      setDepartmentResidentsError("");
      return () => {
        isActive = false;
      };
    }

    async function loadDatabaseResidents() {
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

    loadDatabaseResidents();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  useEffect(() => {
    let isActive = true;

    if (currentUser?.role !== "admin") {
      setAdminProfileList([]);
      setIsAdminProfilesLoading(false);
      setAdminProfilesError("");
      return () => {
        isActive = false;
      };
    }

    async function loadAdminProfiles() {
      setIsAdminProfilesLoading(true);
      setAdminProfilesError("");

      try {
        const profiles = await fetchAdminProfiles();

        if (!isActive) {
          return;
        }

        setAdminProfileList(profiles);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setAdminProfileList([]);
        setAdminProfilesError(
          error?.status === 403
            ? "Only Admin accounts can load database profiles."
            : "Admin profile database API is unavailable. Start the backend with npm run dev:server, then refresh."
        );
      } finally {
        if (isActive) {
          setIsAdminProfilesLoading(false);
        }
      }
    }

    loadAdminProfiles();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  useEffect(() => {
    let isActive = true;

    if (!currentUser) {
      setDocumentRequestList([]);
      setIsDocumentRequestsLoading(false);
      setDocumentRequestsError("");
      return () => {
        isActive = false;
      };
    }

    async function loadDocumentRequests() {
      setIsDocumentRequestsLoading(true);
      setDocumentRequestsError("");

      try {
        const requests = await fetchDocumentRequests();

        if (!isActive) {
          return;
        }

        setDocumentRequestList(requests);
      } catch (_error) {
        if (!isActive) {
          return;
        }

        setDocumentRequestList([]);
        setDocumentRequestsError(
          "Document request database API is unavailable. Start the backend with npm run dev:server, then refresh."
        );
      } finally {
        if (isActive) {
          setIsDocumentRequestsLoading(false);
        }
      }
    }

    loadDocumentRequests();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  useEffect(() => {
    let isActive = true;

    if (currentUser?.role !== "lupon") {
      setLuponCaseList([]);
      setIsLuponCasesLoading(false);
      setLuponCasesError("");
      return () => {
        isActive = false;
      };
    }

    async function loadLuponCases() {
      setIsLuponCasesLoading(true);
      setLuponCasesError("");

      try {
        const cases = await fetchLuponCases();

        if (!isActive) {
          return;
        }

        setLuponCaseList(cases);
      } catch (_error) {
        if (!isActive) {
          return;
        }

        setLuponCaseList([]);
        setLuponCasesError(
          "Lupon case database API is unavailable. Start the backend with npm run dev:server, then refresh."
        );
      } finally {
        if (isActive) {
          setIsLuponCasesLoading(false);
        }
      }
    }

    loadLuponCases();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

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

  useEffect(() => {
    if (
      ["department", "lupon"].includes(currentUser?.role) &&
      databaseResidentList.length > 0 &&
      !databaseResidentList.some((resident) => resident.id === selectedResidentId)
    ) {
      setSelectedResidentId(databaseResidentList[0].id);
    }
  }, [currentUser, databaseResidentList, selectedResidentId]);

  const luponResidents = useMemo(
    () =>
      filterResidents({
        query: luponSearchQuery,
        statusFilter: luponStatusFilter,
        residents: databaseResidentList
      }),
    [databaseResidentList, luponSearchQuery, luponStatusFilter]
  );

  const selectedResident =
    databaseResidentList.find((resident) => resident.id === selectedResidentId) ??
    databaseResidentList[0];
  const selectedDepartmentResident =
    departmentResidentRecords.find((resident) => resident.id === selectedResidentId) ??
    departmentResidentRecords[0] ??
    null;

  function getLandingPage(role) {
    if (role === "department") {
      return "department";
    }

    if (role === "lupon") {
      return "lupon";
    }

    return "admin";
  }

  async function handleLogin(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const username = form.get("username") ?? "";
    const password = form.get("password") ?? "";

    try {
      const user = await loginUser({ username, password });

      setCurrentUser(user);
      setLoginError("");
      setSelectedResidentId(defaultResident.id);
      setFormMode("edit");
      setFormData(cloneResident(defaultResident));
      setCurrentPage(getLandingPage(user.role));
    } catch (error) {
      if (error?.status === 401 || error?.status === 400) {
        setLoginError("Invalid credentials. Use one of the local accounts");
        return;
      }

      setLoginError(
        "Authentication API is unavailable. Start the backend with npm run dev:server, then try again."
      );
      return;
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (_error) {
      // Local state still needs to clear if the backend is unavailable.
    }

    setCurrentUser(null);
    setCurrentPage("login");
    setLoginError("");
    setDepartmentSearchQuery("");
    setDepartmentStatusFilter("all");
    setLuponSearchQuery("");
    setLuponStatusFilter("all");
    setDocumentRequestList([]);
    setDocumentRequestsError("");
    setAdminProfileList([]);
    setAdminProfilesError("");
    setLuponCaseList([]);
    setLuponCasesError("");
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
    const resident = databaseResidentList.find((item) => item.id === residentId);
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

    const newResident = createBlankResident(databaseResidentList);
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

  async function handleFormSave(event) {
    event.preventDefault();

    const validation = validateResidentForm(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    if (formMode === "add") {
      setFormErrors({
        form: "Adding new residents is not database-backed yet. Edit an existing resident for staging."
      });
      return;
    }

    try {
      const savedResident = await updateResident(selectedResidentId, formData);

      setDatabaseResidentList((current) =>
        current.map((resident) => (resident.id === selectedResidentId ? savedResident : resident))
      );
      setSelectedResidentId(savedResident.id);
      setFormMode("edit");
      setFormErrors({});
      setCurrentPage("lupon");
    } catch (_error) {
      setFormErrors({
        form: "Resident database save failed. Check the backend API and try again."
      });
    }
  }

  async function handleDocumentRequestSave(request) {
    if (request.id) {
      setDocumentRequestsError("Updating existing document requests is not database-backed yet.");
      return false;
    }

    setIsDocumentRequestsLoading(true);
    setDocumentRequestsError("");

    try {
      const savedRequest = await createDocumentRequest(request);

      setDocumentRequestList((current) => [savedRequest, ...current]);
      return savedRequest;
    } catch (_error) {
      setDocumentRequestsError("Document request save failed. Check the backend API and try again.");
      return false;
    } finally {
      setIsDocumentRequestsLoading(false);
    }
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
          defaultProcessedBy={currentUser.name}
          documentRequestError={documentRequestsError}
          documentRequests={documentRequestList}
          isDocumentRequestLoading={isDocumentRequestsLoading}
          onDocumentRequestSave={handleDocumentRequestSave}
          onQueryChange={setDepartmentSearchQuery}
          onSelectResident={openResidentVerification}
          onStatusFilterChange={setDepartmentStatusFilter}
          query={departmentSearchQuery}
          residentDataSource="Database API"
          residentError={departmentResidentsError}
          residents={departmentResidentRecords}
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
          isLuponCaseLoading={isLuponCasesLoading}
          luponCaseError={luponCasesError}
          luponCases={luponCaseList}
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
          onSave={handleFormSave}
        />
      ) : null}

      {currentPage === "admin" ? (
        <AdminPanel
          documentRequests={documentRequestList}
          error={adminProfilesError}
          isLoading={isAdminProfilesLoading}
          residents={residentList}
          users={adminProfileList}
        />
      ) : null}
    </AppShell>
  );
}
