import { useEffect, useMemo, useState } from "react";
import { residents as initialResidents } from "./data/residents";
import {
  archiveAdminResident,
  createAdminResident,
  fetchAdminResidents,
  restoreAdminResident,
  updateAdminResident
} from "./features/admin/api/adminResidentsApi";
import { fetchAdminAuditLogs } from "./features/admin/api/adminAuditLogsApi";
import {
  createAdminProfile,
  fetchAdminProfiles,
  resetAdminProfilePassword,
  updateAdminProfileStatus
} from "./features/admin/api/adminProfilesApi";
import {
  commitExcelImport,
  fetchExcelWorkbookSheets,
  fetchExcelWorksheetHeaders,
  previewExcelImport,
  undoExcelImportBatch
} from "./features/admin/api/excelImportApi";
import AdminPanel from "./features/admin/components/AdminPanel";
import { commitExcelImportAndRefreshResidents } from "./features/admin/lib/excelImportCommitState";
import {
  changePassword,
  fetchCurrentUser,
  loginUser,
  logoutUser
} from "./features/auth/api/authApi";
import LoginScreen from "./features/auth/components/LoginScreen";
import {
  archiveDocumentRequest,
  createDocumentRequest,
  fetchDocumentRequests,
  markDocumentRequestProcessing,
  markDocumentRequestReleased
} from "./features/department/api/documentRequestsApi";
import DepartmentDashboard from "./features/department/components/DepartmentDashboard";
import {
  createLuponCaseForResident,
  fetchLuponCases,
  resolveLuponCase,
  updateLuponCaseDetails
} from "./features/lupon/api/luponCasesApi";
import LuponDashboard from "./features/lupon/components/LuponDashboard";
import { getLuponCasesForResident } from "./features/lupon/lib/luponCaseDisplay";
import { fetchResidents, updateResident } from "./features/residents/api/residentsApi";
import ResidentRecordForm from "./features/residents/components/ResidentRecordForm";
import ResidentVerification from "./features/residents/components/ResidentVerification";
import { cloneResident } from "./features/residents/lib/cloneResident";
import { validateResidentForm } from "./features/residents/lib/validateResidentForm";
import AppNavigation from "./shared/components/AppNavigation";
import AppShell from "./shared/components/AppShell";
import { filterResidents } from "./shared/lib/filterResidents";
import { canEditRecord } from "./shared/lib/permissions";
import { pageCopy } from "./shared/lib/pageCopy";

const defaultResident = initialResidents[0];
const DEFAULT_EXCEL_IMPORT_COLUMN_MAPPING = {
  fullName: "A",
  address: "B",
  precinctNo: "C",
  birthdate: "G",
  civilStatus: "H",
  occupation: "I",
  exactAddress: "J",
  contactNumber: "K",
  sitio: "M",
  remarks: "O"
};
const DEFAULT_EXCEL_IMPORT_SHEET_DEFAULTS = {
  voterStatus: ""
};
const DEFAULT_EXCEL_IMPORT_MODE = "skipDuplicates";
const ADMIN_PAGE_SIZE = 5;
const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: ADMIN_PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false
};

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
  const [passwordChangeStatus, setPasswordChangeStatus] = useState({
    error: "",
    message: ""
  });
  const [residentList] = useState(initialResidents);
  const [databaseResidentList, setDatabaseResidentList] = useState([]);
  const [isDepartmentResidentsLoading, setIsDepartmentResidentsLoading] = useState(true);
  const [departmentResidentsError, setDepartmentResidentsError] = useState("");
  const [documentRequestList, setDocumentRequestList] = useState([]);
  const [adminProfileList, setAdminProfileList] = useState([]);
  const [isAdminProfilesLoading, setIsAdminProfilesLoading] = useState(false);
  const [isAdminProfileMutating, setIsAdminProfileMutating] = useState(false);
  const [adminProfilesError, setAdminProfilesError] = useState("");
  const [adminProfileActionError, setAdminProfileActionError] = useState("");
  const [adminProfileActionMessage, setAdminProfileActionMessage] = useState("");
  const [adminResidentList, setAdminResidentList] = useState([]);
  const [adminResidentPagination, setAdminResidentPagination] = useState(DEFAULT_PAGINATION);
  const [adminResidentQuery, setAdminResidentQuery] = useState("");
  const [adminResidentStatusFilter, setAdminResidentStatusFilter] = useState("active");
  const [adminIncludeArchivedResidents, setAdminIncludeArchivedResidents] = useState(false);
  const [isAdminResidentsLoading, setIsAdminResidentsLoading] = useState(false);
  const [isAdminResidentMutating, setIsAdminResidentMutating] = useState(false);
  const [adminAuditLogs, setAdminAuditLogs] = useState([]);
  const [adminAuditLogPagination, setAdminAuditLogPagination] = useState(DEFAULT_PAGINATION);
  const [adminAuditLogFilters, setAdminAuditLogFilters] = useState({
    actor: "",
    role: "",
    action: "",
    entityType: ""
  });
  const [isAdminAuditLogsLoading, setIsAdminAuditLogsLoading] = useState(false);
  const [excelImportPreview, setExcelImportPreview] = useState(null);
  const [excelImportCommitSummary, setExcelImportCommitSummary] = useState(null);
  const [excelImportError, setExcelImportError] = useState("");
  const [excelImportSheetNames, setExcelImportSheetNames] = useState([]);
  const [excelImportHeaders, setExcelImportHeaders] = useState([]);
  const [excelImportHeaderRowNumber, setExcelImportHeaderRowNumber] = useState(1);
  const [excelImportColumnMapping, setExcelImportColumnMapping] = useState(
    DEFAULT_EXCEL_IMPORT_COLUMN_MAPPING
  );
  const [excelImportSheetDefaults, setExcelImportSheetDefaults] = useState(
    DEFAULT_EXCEL_IMPORT_SHEET_DEFAULTS
  );
  const [excelImportMode, setExcelImportMode] = useState(DEFAULT_EXCEL_IMPORT_MODE);
  const [selectedExcelImportSheet, setSelectedExcelImportSheet] = useState("");
  const [isExcelImportSheetsLoading, setIsExcelImportSheetsLoading] = useState(false);
  const [isExcelImportPreviewLoading, setIsExcelImportPreviewLoading] = useState(false);
  const [isExcelImportCommitLoading, setIsExcelImportCommitLoading] = useState(false);
  const [isExcelImportUndoLoading, setIsExcelImportUndoLoading] = useState(false);
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
  const [luponCaseDraft, setLuponCaseDraft] = useState({
    caseTitle: "",
    confidentialSummary: "",
    isCreating: false
  });

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

    if (!currentUser || !["admin", "department", "lupon"].includes(currentUser.role)) {
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
      setIsAdminProfileMutating(false);
      setAdminProfilesError("");
      setAdminProfileActionError("");
      setAdminProfileActionMessage("");
      setAdminResidentList([]);
      setAdminResidentPagination(DEFAULT_PAGINATION);
      setAdminResidentQuery("");
      setAdminResidentStatusFilter("active");
      setAdminIncludeArchivedResidents(false);
      setIsAdminResidentsLoading(false);
      setIsAdminResidentMutating(false);
      setAdminAuditLogs([]);
      setAdminAuditLogPagination(DEFAULT_PAGINATION);
      setAdminAuditLogFilters({
        actor: "",
        role: "",
        action: "",
        entityType: ""
      });
      setIsAdminAuditLogsLoading(false);
      setExcelImportPreview(null);
      setExcelImportCommitSummary(null);
      setExcelImportError("");
      setExcelImportSheetNames([]);
      setExcelImportHeaders([]);
      setExcelImportHeaderRowNumber(1);
      setExcelImportColumnMapping(DEFAULT_EXCEL_IMPORT_COLUMN_MAPPING);
      setExcelImportSheetDefaults(DEFAULT_EXCEL_IMPORT_SHEET_DEFAULTS);
      setExcelImportMode(DEFAULT_EXCEL_IMPORT_MODE);
      setSelectedExcelImportSheet("");
      setIsExcelImportSheetsLoading(false);
      setIsExcelImportPreviewLoading(false);
      setIsExcelImportCommitLoading(false);
      setIsExcelImportUndoLoading(false);
      return () => {
        isActive = false;
      };
    }

    async function loadAdminData() {
      setIsAdminProfilesLoading(true);
      setIsAdminResidentsLoading(true);
      setAdminProfilesError("");

      try {
        const [profiles, adminResidents] = await Promise.all([
          fetchAdminProfiles(),
          fetchAdminResidents({
            page: adminResidentPagination.page,
            pageSize: adminResidentPagination.pageSize,
            query: adminResidentQuery,
            status: adminResidentStatusFilter
          })
        ]);

        if (!isActive) {
          return;
        }

        setAdminProfileList(profiles);
        setAdminResidentPageData(adminResidents);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setAdminProfileList([]);
        setAdminResidentList([]);
        setAdminResidentPagination(DEFAULT_PAGINATION);
        setAdminProfilesError(
          error?.status === 403
            ? "Only Admin accounts can load database profiles."
            : "Admin database API is unavailable. Start the backend with npm run dev:server, then refresh."
        );
      } finally {
        if (isActive) {
          setIsAdminProfilesLoading(false);
          setIsAdminResidentsLoading(false);
        }
      }
    }

    loadAdminData();

    return () => {
      isActive = false;
    };
  }, [
    adminResidentPagination.page,
    adminResidentPagination.pageSize,
    adminResidentQuery,
    adminResidentStatusFilter,
    currentUser
  ]);

  useEffect(() => {
    let isActive = true;

    if (currentUser?.role !== "admin") {
      return () => {
        isActive = false;
      };
    }

    async function loadAdminAuditLogs() {
      setIsAdminAuditLogsLoading(true);

      try {
        const auditLogPage = await fetchAdminAuditLogs({
          ...adminAuditLogFilters,
          page: adminAuditLogPagination.page,
          pageSize: adminAuditLogPagination.pageSize
        });

        if (!isActive) {
          return;
        }

        setAdminAuditLogs(auditLogPage.items);
        setAdminAuditLogPagination({
          page: auditLogPage.page,
          pageSize: auditLogPage.pageSize,
          total: auditLogPage.total,
          totalPages: auditLogPage.totalPages,
          hasNext: auditLogPage.hasNext,
          hasPrevious: auditLogPage.hasPrevious
        });
      } catch (_error) {
        if (!isActive) {
          return;
        }

        setAdminAuditLogs([]);
        setAdminAuditLogPagination(DEFAULT_PAGINATION);
      } finally {
        if (isActive) {
          setIsAdminAuditLogsLoading(false);
        }
      }
    }

    loadAdminAuditLogs();

    return () => {
      isActive = false;
    };
  }, [
    adminAuditLogFilters,
    adminAuditLogPagination.page,
    adminAuditLogPagination.pageSize,
    currentUser
  ]);

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
  const selectedLuponCase = getLuponCasesForResident(selectedResidentId, luponCaseList)[0] ?? null;

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
        setLoginError("Invalid credentials. Use your assigned Barangay Nazareth account.");
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
    setPasswordChangeStatus({ error: "", message: "" });
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
    setAdminProfileActionError("");
    setAdminProfileActionMessage("");
    setAdminResidentList([]);
    setAdminResidentPagination(DEFAULT_PAGINATION);
    setAdminResidentQuery("");
    setAdminResidentStatusFilter("active");
    setAdminIncludeArchivedResidents(false);
    setIsAdminResidentsLoading(false);
    setIsAdminResidentMutating(false);
    setAdminAuditLogs([]);
    setAdminAuditLogPagination(DEFAULT_PAGINATION);
    setAdminAuditLogFilters({
      actor: "",
      role: "",
      action: "",
      entityType: ""
    });
    setIsAdminAuditLogsLoading(false);
    setExcelImportPreview(null);
    setExcelImportCommitSummary(null);
    setExcelImportError("");
    setExcelImportSheetNames([]);
    setExcelImportHeaders([]);
    setExcelImportHeaderRowNumber(1);
    setExcelImportColumnMapping(DEFAULT_EXCEL_IMPORT_COLUMN_MAPPING);
    setExcelImportSheetDefaults(DEFAULT_EXCEL_IMPORT_SHEET_DEFAULTS);
    setExcelImportMode(DEFAULT_EXCEL_IMPORT_MODE);
    setSelectedExcelImportSheet("");
    setIsExcelImportSheetsLoading(false);
    setIsExcelImportPreviewLoading(false);
    setIsExcelImportCommitLoading(false);
    setIsExcelImportUndoLoading(false);
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
    const latestLuponCase = getLuponCasesForResident(residentId, luponCaseList)[0] ?? null;
    setLuponCaseDraft({
      caseTitle: latestLuponCase?.caseTitle ?? latestLuponCase?.caseType ?? "",
      confidentialSummary: latestLuponCase?.confidentialSummary ?? "",
      isCreating: false
    });
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
        form: "New resident records are managed through Admin import/registry tools."
      });
      return;
    }

    try {
      const savedResident = await updateResident(selectedResidentId, formData);
      const latestLuponCase = getLuponCasesForResident(selectedResidentId, luponCaseList)[0] ?? null;
      let savedLuponCase = null;

      if (
        currentUser.role === "lupon" &&
        latestLuponCase &&
        (luponCaseDraft.caseTitle !== (latestLuponCase.caseTitle ?? latestLuponCase.caseType ?? "") ||
          luponCaseDraft.confidentialSummary !== (latestLuponCase.confidentialSummary ?? ""))
      ) {
        savedLuponCase = await updateLuponCaseDetails(latestLuponCase.id, {
          caseTitle: luponCaseDraft.caseTitle,
          confidentialSummary: luponCaseDraft.confidentialSummary
        });
      }

      if (currentUser.role === "lupon" && !latestLuponCase && luponCaseDraft.isCreating) {
        savedLuponCase = await createLuponCaseForResident({
          residentId: selectedResidentId,
          caseTitle: luponCaseDraft.caseTitle,
          confidentialSummary: luponCaseDraft.confidentialSummary
        });
      }

      setDatabaseResidentList((current) =>
        current.map((resident) => (resident.id === selectedResidentId ? savedResident : resident))
      );
      if (savedLuponCase) {
        setLuponCaseList((current) =>
          current.some((luponCase) => luponCase.id === savedLuponCase.id)
            ? current.map((luponCase) =>
                luponCase.id === savedLuponCase.id ? savedLuponCase : luponCase
              )
            : [savedLuponCase, ...current]
        );
      }
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

  async function handleResolveLuponCase(luponCase) {
    if (!luponCase?.id) {
      return false;
    }

    try {
      const resolvedCase = await resolveLuponCase(luponCase.id);

      setLuponCaseList((current) =>
        current.map((item) => (item.id === resolvedCase.id ? resolvedCase : item))
      );
      setLuponCaseDraft({
        caseTitle: "",
        confidentialSummary: "",
        isCreating: false
      });
      setFormErrors({});
      return true;
    } catch (_error) {
      setFormErrors({
        form: "Lupon case resolve failed. Check the backend API and try again."
      });
      return false;
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
    } catch (error) {
      setDocumentRequestsError(
        error?.message || "Document request save failed. Check the backend API and try again."
      );
      return false;
    } finally {
      setIsDocumentRequestsLoading(false);
    }
  }

  async function handleDocumentRequestMarkProcessing(requestId) {
    setIsDocumentRequestsLoading(true);
    setDocumentRequestsError("");

    try {
      const updatedRequest = await markDocumentRequestProcessing(requestId);

      setDocumentRequestList((current) =>
        current.map((request) => (request.id === requestId ? updatedRequest : request))
      );
      return updatedRequest;
    } catch (_error) {
      setDocumentRequestsError("Document request status update failed. Check the backend API and try again.");
      return false;
    } finally {
      setIsDocumentRequestsLoading(false);
    }
  }

  async function handleDocumentRequestMarkReleased(requestId) {
    setIsDocumentRequestsLoading(true);
    setDocumentRequestsError("");

    try {
      const updatedRequest = await markDocumentRequestReleased(requestId);

      setDocumentRequestList((current) =>
        current.map((request) => (request.id === requestId ? updatedRequest : request))
      );
      return updatedRequest;
    } catch (_error) {
      setDocumentRequestsError("Document request release failed. Check the backend API and try again.");
      return false;
    } finally {
      setIsDocumentRequestsLoading(false);
    }
  }

  async function handleDocumentRequestArchive(requestId, archiveDetails) {
    setIsDocumentRequestsLoading(true);
    setDocumentRequestsError("");

    try {
      await archiveDocumentRequest(requestId, archiveDetails);
      setDocumentRequestList((current) => current.filter((request) => request.id !== requestId));
      return true;
    } catch (_error) {
      setDocumentRequestsError("Document request archive failed. Check the backend API and try again.");
      return false;
    } finally {
      setIsDocumentRequestsLoading(false);
    }
  }

  async function handlePasswordChange({ currentPassword, newPassword }) {
    setPasswordChangeStatus({ error: "", message: "" });

    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordChangeStatus({
        error: "",
        message: "Password changed."
      });
      return true;
    } catch (error) {
      setPasswordChangeStatus({
        error: error?.status === 401 ? "Current password is incorrect." : "Password change failed.",
        message: ""
      });
      return false;
    }
  }

  async function handleCreateAdminProfile(profile) {
    setIsAdminProfileMutating(true);
    setAdminProfileActionError("");
    setAdminProfileActionMessage("");

    try {
      const createdProfile = await createAdminProfile(profile);

      setAdminProfileList((current) => [...current, createdProfile]);
      setAdminProfileActionMessage("Account created.");
      return createdProfile;
    } catch (error) {
      setAdminProfileActionError(error?.message ?? "Account creation failed.");
      return null;
    } finally {
      setIsAdminProfileMutating(false);
    }
  }

  async function handleToggleAdminProfileStatus(profileId, status) {
    setIsAdminProfileMutating(true);
    setAdminProfileActionError("");
    setAdminProfileActionMessage("");

    try {
      const updatedProfile = await updateAdminProfileStatus(profileId, status);

      setAdminProfileList((current) =>
        current.map((profile) => (profile.id === profileId ? updatedProfile : profile))
      );
      setAdminProfileActionMessage(
        status === "disabled" ? "Account deactivated." : "Account reactivated."
      );
      return updatedProfile;
    } catch (error) {
      setAdminProfileActionError(error?.message ?? "Account status update failed.");
      return null;
    } finally {
      setIsAdminProfileMutating(false);
    }
  }

  async function handleResetAdminProfilePassword(profileId, temporaryPassword) {
    setIsAdminProfileMutating(true);
    setAdminProfileActionError("");
    setAdminProfileActionMessage("");

    try {
      const updatedProfile = await resetAdminProfilePassword(profileId, temporaryPassword);

      setAdminProfileList((current) =>
        current.map((profile) => (profile.id === profileId ? updatedProfile : profile))
      );
      setAdminProfileActionMessage("Temporary password reset.");
      return updatedProfile;
    } catch (error) {
      setAdminProfileActionError(error?.message ?? "Password reset failed.");
      return null;
    } finally {
      setIsAdminProfileMutating(false);
    }
  }

  function setAdminResidentPageData(pageData) {
    setAdminResidentList(pageData.items);
    setAdminResidentPagination({
      page: pageData.page,
      pageSize: pageData.pageSize,
      total: pageData.total,
      totalPages: pageData.totalPages,
      hasNext: pageData.hasNext,
      hasPrevious: pageData.hasPrevious
    });
  }

  function resetAdminResidentPage() {
    setAdminResidentPagination((current) => ({
      ...current,
      page: 1
    }));
  }

  function handleAdminResidentQueryChange(query) {
    setAdminResidentQuery(query);
    resetAdminResidentPage();
  }

  function handleAdminResidentStatusFilterChange(status) {
    const nextStatus = status || "active";

    setAdminResidentStatusFilter(nextStatus);
    setAdminIncludeArchivedResidents(nextStatus === "all");
    resetAdminResidentPage();
  }

  function handleToggleIncludeArchivedResidents(includeArchived) {
    handleAdminResidentStatusFilterChange(includeArchived ? "all" : "active");
  }

  function handleAdminResidentPageChange(page) {
    setAdminResidentPagination((current) => ({
      ...current,
      page: Math.max(1, page)
    }));
  }

  async function handleCreateAdminResident(resident) {
    setIsAdminResidentMutating(true);
    setAdminProfileActionError("");
    setAdminProfileActionMessage("");

    try {
      const { resident: createdResident, warnings } = await createAdminResident(resident);

      setDatabaseResidentList((current) =>
        current.some((item) => item.id === createdResident.id)
          ? current
          : [...current, createdResident]
      );

      const refreshedResidents = await fetchAdminResidents({
        page: 1,
        pageSize: adminResidentPagination.pageSize,
        query: adminResidentQuery,
        status: adminResidentStatusFilter
      });

      setAdminResidentPageData(refreshedResidents);
      setAdminProfileActionMessage(
        warnings.length > 0
          ? `Resident created. ${warnings[0]}`
          : "Resident created."
      );
      return createdResident;
    } catch (error) {
      setAdminProfileActionError(error?.message ?? "Resident creation failed.");
      return null;
    } finally {
      setIsAdminResidentMutating(false);
    }
  }

  async function handleUpdateAdminResident(residentId, resident) {
    setIsAdminResidentMutating(true);
    setAdminProfileActionError("");
    setAdminProfileActionMessage("");

    try {
      const updatedResident = await updateAdminResident(residentId, resident);

      setAdminResidentList((current) =>
        current.map((item) => (item.id === residentId ? updatedResident : item))
      );
      setDatabaseResidentList((current) =>
        current.map((item) =>
          item.id === residentId
            ? {
                ...item,
                fullName: updatedResident.fullName,
                name: updatedResident.fullName,
                birthDate: updatedResident.birthDate,
                civilStatus: updatedResident.civilStatus,
                occupation: updatedResident.occupation,
                address: updatedResident.address,
                contactNumber: updatedResident.contactNumber,
                additionalInformation: updatedResident.additionalInformation,
                precinctNumber: updatedResident.precinctNumber,
                registeredVoter: Boolean(updatedResident.precinctNumber)
              }
            : item
        )
      );
      setAdminProfileActionMessage("Resident profile updated.");
      return updatedResident;
    } catch (error) {
      setAdminProfileActionError(error?.message ?? "Resident update failed.");
      return null;
    } finally {
      setIsAdminResidentMutating(false);
    }
  }

  async function handleArchiveAdminResident(residentId) {
    setIsAdminResidentMutating(true);
    setAdminProfileActionError("");
    setAdminProfileActionMessage("");

    try {
      const archivedResident = await archiveAdminResident(residentId);

      setAdminResidentList((current) =>
        adminResidentStatusFilter === "all" || adminResidentStatusFilter === "archived"
          ? current.map((item) => (item.id === residentId ? archivedResident : item))
          : current.filter((item) => item.id !== residentId)
      );
      setDatabaseResidentList((current) => current.filter((item) => item.id !== residentId));
      setAdminProfileActionMessage("Resident archived.");
      return archivedResident;
    } catch (error) {
      setAdminProfileActionError(error?.message ?? "Resident archive failed.");
      return null;
    } finally {
      setIsAdminResidentMutating(false);
    }
  }

  async function handleRestoreAdminResident(residentId) {
    setIsAdminResidentMutating(true);
    setAdminProfileActionError("");
    setAdminProfileActionMessage("");

    try {
      const restoredResident = await restoreAdminResident(residentId);

      setAdminResidentList((current) =>
        current.map((item) => (item.id === residentId ? restoredResident : item))
      );
      setDatabaseResidentList((current) =>
        current.some((item) => item.id === residentId) ? current : [...current, restoredResident]
      );
      setAdminProfileActionMessage("Resident restored.");
      return restoredResident;
    } catch (error) {
      setAdminProfileActionError(error?.message ?? "Resident restore failed.");
      return null;
    } finally {
      setIsAdminResidentMutating(false);
    }
  }

  async function handleLoadExcelWorkbookSheets(file) {
    setExcelImportPreview(null);
    setExcelImportCommitSummary(null);
    setExcelImportError("");
    setExcelImportSheetNames([]);
    setExcelImportHeaders([]);
    setExcelImportHeaderRowNumber(1);
    setExcelImportColumnMapping(DEFAULT_EXCEL_IMPORT_COLUMN_MAPPING);
    setExcelImportSheetDefaults(DEFAULT_EXCEL_IMPORT_SHEET_DEFAULTS);
    setExcelImportMode(DEFAULT_EXCEL_IMPORT_MODE);
    setSelectedExcelImportSheet("");

    if (!file) {
      return null;
    }

    setIsExcelImportSheetsLoading(true);

    try {
      const result = await fetchExcelWorkbookSheets(file);
      const defaultSheet = result.defaultSelectedSheet ?? "";

      setExcelImportSheetNames(result.sheetNames ?? []);
      setSelectedExcelImportSheet(defaultSheet);

      if (defaultSheet) {
        const headerResult = await fetchExcelWorksheetHeaders(file, {
          selectedSheetName: defaultSheet,
          headerRowNumber: 1
        });

        setExcelImportHeaders(headerResult.headers ?? []);
      }

      return result;
    } catch (error) {
      setExcelImportError(error?.message ?? "Workbook sheet lookup failed.");
      return null;
    } finally {
      setIsExcelImportSheetsLoading(false);
    }
  }

  async function handleLoadExcelWorksheetHeaders(file, { selectedSheetName, headerRowNumber }) {
    setExcelImportPreview(null);
    setExcelImportCommitSummary(null);
    setExcelImportError("");

    if (!file || !selectedSheetName) {
      setExcelImportHeaders([]);
      return null;
    }

    setIsExcelImportSheetsLoading(true);

    try {
      const result = await fetchExcelWorksheetHeaders(file, {
        selectedSheetName,
        headerRowNumber
      });

      setSelectedExcelImportSheet(result.sheetName ?? selectedSheetName);
      setExcelImportHeaderRowNumber(result.headerRowNumber ?? headerRowNumber);
      setExcelImportHeaders(result.headers ?? []);
      return result;
    } catch (error) {
      setExcelImportHeaders([]);
      setExcelImportError(error?.message ?? "Worksheet header lookup failed.");
      return null;
    } finally {
      setIsExcelImportSheetsLoading(false);
    }
  }

  function handleExcelImportColumnMappingChange(field, column) {
    setExcelImportPreview(null);
    setExcelImportCommitSummary(null);
    setExcelImportColumnMapping((current) => ({
      ...current,
      [field]: column
    }));
  }

  function handleExcelImportSheetDefaultChange(field, value) {
    setExcelImportPreview(null);
    setExcelImportCommitSummary(null);
    setExcelImportSheetDefaults((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleExcelImportModeChange(importMode) {
    setExcelImportPreview(null);
    setExcelImportCommitSummary(null);
    setExcelImportMode(importMode || DEFAULT_EXCEL_IMPORT_MODE);
  }

  async function handlePreviewExcelImport(file) {
    setIsExcelImportPreviewLoading(true);
    setExcelImportError("");
    setExcelImportCommitSummary(null);

    try {
      const preview = await previewExcelImport(file, {
        selectedSheetName: selectedExcelImportSheet,
        headerRowNumber: excelImportHeaderRowNumber,
        columnMapping: excelImportColumnMapping,
        sheetDefaults: excelImportSheetDefaults,
        importMode: excelImportMode
      });

      setExcelImportPreview(preview);
      setExcelImportSheetNames(preview.workbookSheetNames ?? []);
      setSelectedExcelImportSheet(preview.sheetName ?? selectedExcelImportSheet);
      return preview;
    } catch (error) {
      setExcelImportPreview(null);
      setExcelImportError(error?.message ?? "Excel import preview failed.");
      return null;
    } finally {
      setIsExcelImportPreviewLoading(false);
    }
  }

  async function handleCommitExcelImport(file, confirmations) {
    setIsExcelImportCommitLoading(true);
    setExcelImportError("");

    try {
      const { summary, residentRefreshError } = await commitExcelImportAndRefreshResidents({
        confirmations: {
          ...confirmations,
          selectedSheetName: selectedExcelImportSheet,
          headerRowNumber: excelImportHeaderRowNumber,
          columnMapping: excelImportColumnMapping,
          sheetDefaults: excelImportSheetDefaults,
          importMode: excelImportMode
        },
        commitExcelImportRequest: commitExcelImport,
        fetchResidentList: fetchResidents,
        file,
        setDatabaseResidentList,
        setExcelImportCommitSummary
      });

      if (residentRefreshError) {
        setExcelImportError(
          "Import committed, but resident metrics could not refresh. Reload Admin to verify the latest count."
        );
      }

      try {
        const adminResidents = await fetchAdminResidents({
          page: adminResidentPagination.page,
          pageSize: adminResidentPagination.pageSize,
          query: adminResidentQuery,
          status: adminResidentStatusFilter
        });

        setAdminResidentPageData(adminResidents);
      } catch (_error) {
        setExcelImportError(
          "Import committed, but Admin resident search could not refresh. Reload Admin to verify the latest records."
        );
      }

      return summary;
    } catch (error) {
      setExcelImportCommitSummary(null);
      setExcelImportError(error?.message ?? "Excel import commit failed.");
      return null;
    } finally {
      setIsExcelImportCommitLoading(false);
    }
  }

  async function handleUndoExcelImport(importBatchId) {
    const confirmed = window.confirm(
      "Undo this import batch? Created residents will be archived and updated residents will be restored."
    );

    if (!confirmed) {
      return null;
    }

    setIsExcelImportUndoLoading(true);
    setExcelImportError("");

    try {
      const result = await undoExcelImportBatch(importBatchId);

      setExcelImportCommitSummary((current) => ({
        ...(current ?? {}),
        undoSummary: result.summary,
        undone: true
      }));

      const [residents, adminResidents] = await Promise.all([
        fetchResidents(),
        fetchAdminResidents({
          page: adminResidentPagination.page,
          pageSize: adminResidentPagination.pageSize,
          query: adminResidentQuery,
          status: adminResidentStatusFilter
        })
      ]);

      setDatabaseResidentList(residents);
      setAdminResidentPageData(adminResidents);
      return result.summary;
    } catch (error) {
      setExcelImportError(error?.message ?? "Import undo failed.");
      return null;
    } finally {
      setIsExcelImportUndoLoading(false);
    }
  }

  if (!currentUser) {
    return <LoginScreen error={loginError} onLogin={handleLogin} />;
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
      onChangePassword={handlePasswordChange}
      onLogout={handleLogout}
      passwordChangeStatus={passwordChangeStatus}
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
          onDocumentRequestArchive={handleDocumentRequestArchive}
          onDocumentRequestMarkProcessing={handleDocumentRequestMarkProcessing}
          onDocumentRequestMarkReleased={handleDocumentRequestMarkReleased}
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
          luponCase={selectedLuponCase}
          luponCaseDraft={luponCaseDraft}
          mode={formMode}
          onCancel={closeResidentForm}
          onChange={handleFormChange}
          onLuponCaseDraftChange={setLuponCaseDraft}
          onResolveLuponCase={handleResolveLuponCase}
          onSave={handleFormSave}
        />
      ) : null}

      {currentPage === "admin" ? (
        <AdminPanel
          actionError={adminProfileActionError}
          actionMessage={adminProfileActionMessage}
          documentRequests={documentRequestList}
          excelImportColumnMapping={excelImportColumnMapping}
          excelImportCommitSummary={excelImportCommitSummary}
          excelImportError={excelImportError}
          excelImportHeaderRowNumber={excelImportHeaderRowNumber}
          excelImportHeaders={excelImportHeaders}
          excelImportMode={excelImportMode}
          excelImportPreview={excelImportPreview}
          excelImportSheetDefaults={excelImportSheetDefaults}
          excelImportSheetNames={excelImportSheetNames}
          error={adminProfilesError}
          isExcelImportCommitLoading={isExcelImportCommitLoading}
          isExcelImportPreviewLoading={isExcelImportPreviewLoading}
          isExcelImportSheetsLoading={isExcelImportSheetsLoading}
          isExcelImportUndoLoading={isExcelImportUndoLoading}
          isLoading={isAdminProfilesLoading}
          isMutating={isAdminProfileMutating || isAdminResidentMutating}
          adminResidentQuery={adminResidentQuery}
          adminResidentPagination={adminResidentPagination}
          adminResidentStatusFilter={adminResidentStatusFilter}
          adminResidents={adminResidentList}
          auditLogFilters={adminAuditLogFilters}
          auditLogPagination={adminAuditLogPagination}
          auditLogs={adminAuditLogs}
          includeArchivedResidents={adminIncludeArchivedResidents}
          isAdminAuditLogsLoading={isAdminAuditLogsLoading}
          isAdminResidentsLoading={isAdminResidentsLoading}
          onAdminResidentPageChange={handleAdminResidentPageChange}
          onAdminResidentQueryChange={handleAdminResidentQueryChange}
          onAdminResidentStatusFilterChange={handleAdminResidentStatusFilterChange}
          onArchiveResident={handleArchiveAdminResident}
          onAuditLogFilterChange={setAdminAuditLogFilters}
          onAuditLogPageChange={(page) =>
            setAdminAuditLogPagination((current) => ({
              ...current,
              page: Math.max(1, page)
            }))
          }
          onCommitExcelImport={handleCommitExcelImport}
          onCreateAccount={handleCreateAdminProfile}
          onCreateResident={handleCreateAdminResident}
          onExcelImportColumnMappingChange={handleExcelImportColumnMappingChange}
          onExcelImportModeChange={handleExcelImportModeChange}
          onExcelImportSheetDefaultChange={handleExcelImportSheetDefaultChange}
          onExcelImportHeaderRowChange={setExcelImportHeaderRowNumber}
          onLoadExcelWorksheetHeaders={handleLoadExcelWorksheetHeaders}
          onLoadExcelWorkbookSheets={handleLoadExcelWorkbookSheets}
          onPreviewExcelImport={handlePreviewExcelImport}
          onRestoreResident={handleRestoreAdminResident}
          onResetPassword={handleResetAdminProfilePassword}
          onToggleAccountStatus={handleToggleAdminProfileStatus}
          onToggleIncludeArchivedResidents={handleToggleIncludeArchivedResidents}
          onUpdateResident={handleUpdateAdminResident}
          onUndoExcelImport={handleUndoExcelImport}
          onSelectedExcelImportSheetChange={setSelectedExcelImportSheet}
          residents={databaseResidentList}
          selectedExcelImportSheet={selectedExcelImportSheet}
          users={adminProfileList}
        />
      ) : null}
    </AppShell>
  );
}
