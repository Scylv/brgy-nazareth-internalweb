import { useState } from "react";
import Button from "../../../shared/components/Button";
import MetricCard from "../../../shared/components/MetricCard";
import SectionCard from "../../../shared/components/SectionCard";
import SectionHeader from "../../../shared/components/SectionHeader";
import StateMessage from "../../../shared/components/StateMessage";
import { getAccountGroups, getAdminCounters } from "../lib/accountManagement";

const counterCards = [
  {
    key: "totalResidents",
    label: "Residents",
    tone: "orange"
  },
  {
    key: "totalDepartmentAccounts",
    label: "Department Accounts",
    tone: "sky"
  },
  {
    key: "totalLuponAccounts",
    label: "Lupon Accounts",
    tone: "emerald"
  },
  {
    key: "totalDocumentRequests",
    label: "Document Requests",
    tone: "amber"
  }
];
const importMappingFields = [
  ["firstName", "First name"],
  ["middleName", "Middle name"],
  ["lastName", "Last name"],
  ["fullName", "Full name"],
  ["birthdate", "Birthdate"],
  ["sex", "Sex"],
  ["civilStatus", "Civil status"],
  ["exactAddress", "Exact address"],
  ["sitio", "Sitio"],
  ["contactNumber", "Contact number"],
  ["voterStatus", "Voter status"],
  ["remarks", "Remarks"],
  ["address", "Address"],
  ["precinctNo", "Precinct number"],
  ["occupation", "Occupation"]
];
const importModeOptions = [
  ["skipDuplicates", "Skip duplicates"],
  ["createOnly", "Create only"],
  ["updateMatches", "Update matches"]
];

export default function AdminPanel({
  actionError = "",
  actionMessage = "",
  adminResidentQuery = "",
  adminResidents = [],
  documentRequests,
  excelImportColumnMapping = {},
  excelImportCommitSummary = null,
  excelImportError = "",
  excelImportHeaderRowNumber = 1,
  excelImportHeaders = [],
  excelImportMode = "skipDuplicates",
  excelImportPreview = null,
  excelImportSheetDefaults = {},
  excelImportSheetNames = [],
  includeArchivedResidents = false,
  error = "",
  isAdminResidentsLoading = false,
  isExcelImportCommitLoading = false,
  isExcelImportPreviewLoading = false,
  isExcelImportSheetsLoading = false,
  isExcelImportUndoLoading = false,
  isLoading = false,
  isMutating = false,
  onAdminResidentQueryChange,
  onArchiveResident,
  onCommitExcelImport,
  onCreateAccount,
  onExcelImportColumnMappingChange,
  onExcelImportModeChange,
  onExcelImportHeaderRowChange,
  onExcelImportSheetDefaultChange,
  onLoadExcelWorksheetHeaders,
  onLoadExcelWorkbookSheets,
  onPreviewExcelImport,
  onRestoreResident,
  onResetPassword,
  onToggleAccountStatus,
  onToggleIncludeArchivedResidents,
  onUpdateResident,
  onUndoExcelImport,
  onSelectedExcelImportSheetChange,
  residents,
  selectedExcelImportSheet = "",
  users
}) {
  const [accountForm, setAccountForm] = useState({
    username: "",
    displayName: "",
    role: "department",
    temporaryPassword: ""
  });
  const [resetForm, setResetForm] = useState({
    profileId: "",
    temporaryPassword: ""
  });
  const [selectedImportFile, setSelectedImportFile] = useState(null);
  const [previewedImportFile, setPreviewedImportFile] = useState(null);
  const [residentForm, setResidentForm] = useState(null);
  const [excelImportConfirmations, setExcelImportConfirmations] = useState({
    importConfirmed: false,
    backupConfirmed: false
  });
  const accountGroups = getAccountGroups(users);
  const counters = getAdminCounters({ users, residents, documentRequests });
  const excelImportRows = excelImportPreview?.previewRows ?? [];
  const excelImportErrors = excelImportPreview?.errors ?? [];
  const excelImportWarnings = excelImportPreview?.warnings ?? [];
  const ignoredImportColumns = excelImportPreview?.ignoredColumns ?? [];
  const documentRequestPairs = excelImportPreview?.documentRequestPairsDetected ?? [];
  const importSummary = excelImportPreview?.importSummary ?? {
    totalRows: excelImportPreview?.totalRowsDetected ?? 0,
    newResidents: 0,
    duplicatesSkipped: 0,
    updateCandidates: 0,
    invalidRows: excelImportErrors.length
  };

  function handleAccountFormChange(event) {
    const { name, value } = event.target;

    setAccountForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleCreateAccount(event) {
    event.preventDefault();

    const created = await onCreateAccount?.(accountForm);

    if (created) {
      setAccountForm({
        username: "",
        displayName: "",
        role: "department",
        temporaryPassword: ""
      });
    }
  }

  async function handleExcelPreview(event) {
    event.preventDefault();
    setExcelImportConfirmations({
      importConfirmed: false,
      backupConfirmed: false
    });
    const preview = await onPreviewExcelImport?.(selectedImportFile);

    setPreviewedImportFile(preview ? selectedImportFile : null);
  }

  async function handleExcelCommit(event) {
    event.preventDefault();
    await onCommitExcelImport?.(previewedImportFile, excelImportConfirmations);
  }

  function handleExcelImportConfirmationChange(event) {
    const { checked, name } = event.target;

    setExcelImportConfirmations((current) => ({
      ...current,
      [name]: checked
    }));
  }

  async function handleExcelFileChange(event) {
    const file = event.target.files?.[0] ?? null;

    setSelectedImportFile(file);
    setPreviewedImportFile(null);
    setExcelImportConfirmations({
      importConfirmed: false,
      backupConfirmed: false
    });
    await onLoadExcelWorkbookSheets?.(file);
  }

  async function handleExcelSheetChange(event) {
    const sheetName = event.target.value;

    onSelectedExcelImportSheetChange?.(sheetName);
    setPreviewedImportFile(null);
    setExcelImportConfirmations({
      importConfirmed: false,
      backupConfirmed: false
    });
    await onLoadExcelWorksheetHeaders?.(selectedImportFile, {
      selectedSheetName: sheetName,
      headerRowNumber: excelImportHeaderRowNumber
    });
  }

  async function handleExcelHeaderRowChange(event) {
    const headerRowNumber = Number(event.target.value);

    onExcelImportHeaderRowChange?.(headerRowNumber);
    setPreviewedImportFile(null);
    setExcelImportConfirmations({
      importConfirmed: false,
      backupConfirmed: false
    });
    await onLoadExcelWorksheetHeaders?.(selectedImportFile, {
      selectedSheetName: selectedExcelImportSheet,
      headerRowNumber
    });
  }

  function handleExcelMappingChange(event) {
    const { name, value } = event.target;

    setPreviewedImportFile(null);
    setExcelImportConfirmations({
      importConfirmed: false,
      backupConfirmed: false
    });
    onExcelImportColumnMappingChange?.(name, value);
  }

  function handleExcelSheetDefaultChange(event) {
    const { name, value } = event.target;

    setPreviewedImportFile(null);
    setExcelImportConfirmations({
      importConfirmed: false,
      backupConfirmed: false
    });
    onExcelImportSheetDefaultChange?.(name, value);
  }

  function handleExcelModeChange(event) {
    setPreviewedImportFile(null);
    setExcelImportConfirmations({
      importConfirmed: false,
      backupConfirmed: false
    });
    onExcelImportModeChange?.(event.target.value);
  }

  function handleUndoImport() {
    onUndoExcelImport?.(excelImportCommitSummary?.importBatchId);
  }

  function openResetForm(profileId) {
    setResetForm({
      profileId,
      temporaryPassword: ""
    });
  }

  async function handleResetPassword(event) {
    event.preventDefault();

    const reset = await onResetPassword?.(resetForm.profileId, resetForm.temporaryPassword);

    if (reset) {
      setResetForm({
        profileId: "",
        temporaryPassword: ""
      });
    }
  }

  function openResidentForm(resident) {
    setResidentForm({
      id: resident.id,
      fullName: resident.fullName ?? "",
      address: resident.address ?? "",
      exactAddress: resident.exactAddress ?? "",
      precinctNumber: resident.precinctNumber ?? "",
      birthDate: resident.birthDate ?? "",
      civilStatus: resident.civilStatus ?? "",
      occupation: resident.occupation ?? "",
      contactNumber: resident.contactNumber ?? "",
      sitio: resident.sitio ?? "",
      additionalInformation: resident.additionalInformation ?? ""
    });
  }

  function handleResidentFormChange(event) {
    const { name, value } = event.target;

    setResidentForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleResidentFormSubmit(event) {
    event.preventDefault();

    const updated = await onUpdateResident?.(residentForm.id, residentForm);

    if (updated) {
      setResidentForm(null);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard variant="hero">
        <SectionHeader
          description="View database-backed staff profiles by role while keeping document processing and Lupon case details outside the Admin workspace."
          eyebrow="Account Management"
          title="System Access"
        />

        {isLoading ? (
          <StateMessage className="mt-3" tone="info">
            Loading database profiles...
          </StateMessage>
        ) : null}

        {error ? (
          <StateMessage className="mt-3" tone="danger">
            {error}
          </StateMessage>
        ) : null}

        {actionMessage ? (
          <StateMessage className="mt-3" tone="success">
            {actionMessage}
          </StateMessage>
        ) : null}

        {actionError ? (
          <StateMessage className="mt-3" tone="danger">
            {actionError}
          </StateMessage>
        ) : null}
      </SectionCard>

      <section className="grid gap-4 md:grid-cols-4">
        {counterCards.map((card) => (
          <MetricCard
            key={card.key}
            label={card.label}
            tone={card.tone}
            value={counters[card.key]}
          />
        ))}
      </section>

      <SectionCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow="Resident Management" title="Imported Residents" />

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Search
              <input
                className="w-full min-w-[18rem] rounded-2xl border border-orange-100 px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
                onChange={(event) => onAdminResidentQueryChange?.(event.target.value)}
                placeholder="Name, RBI ID, address, sitio, precinct"
                value={adminResidentQuery}
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-orange-100 px-4 py-2.5 text-sm font-semibold text-slate-700">
              <input
                checked={includeArchivedResidents}
                className="h-4 w-4 rounded border-orange-200 text-gov-700 focus:ring-gov-500"
                onChange={(event) => onToggleIncludeArchivedResidents?.(event.target.checked)}
                type="checkbox"
              />
              Show archived
            </label>
          </div>
        </div>

        {isAdminResidentsLoading ? (
          <StateMessage className="mt-4" tone="info">
            Loading residents from the database API...
          </StateMessage>
        ) : null}

        <div
          className={`mt-5 grid gap-5 ${
            residentForm ? "xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)] xl:items-start" : ""
          }`}
        >
          <div className="overflow-x-auto rounded-2xl border border-orange-100">
            <table className="min-w-[64rem] divide-y divide-orange-100 text-left text-sm">
              <thead className="bg-orange-50 text-xs font-semibold uppercase tracking-[0.12em] text-gov-800">
                <tr>
                  <th className="px-4 py-3">Resident</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Precinct</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100 bg-white">
                {!isAdminResidentsLoading
                  ? adminResidents.map((resident) => (
                      <tr key={resident.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{resident.fullName}</p>
                          <p className="text-xs text-slate-500">{resident.id}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <p>{resident.address || "-"}</p>
                          <p className="text-xs text-slate-500">{resident.exactAddress || "-"}</p>
                          <p className="text-xs text-slate-500">{resident.sitio || "-"}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {resident.precinctNumber || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {resident.contactNumber || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                              resident.archived
                                ? "bg-slate-100 text-slate-600"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {resident.archived ? "Archived" : "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              disabled={isMutating}
                              onClick={() => openResidentForm(resident)}
                              size="sm"
                              variant="quiet"
                            >
                              Edit
                            </Button>
                            {resident.archived ? (
                              <Button
                                disabled={isMutating}
                                onClick={() => onRestoreResident?.(resident.id)}
                                size="sm"
                                variant="secondary"
                              >
                                Restore
                              </Button>
                            ) : (
                              <Button
                                disabled={isMutating}
                                onClick={() => onArchiveResident?.(resident.id)}
                                size="sm"
                                variant="quiet"
                              >
                                Archive
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
            {!isAdminResidentsLoading && adminResidents.length === 0 ? (
              <StateMessage className="rounded-none border-0 bg-white px-5 py-8 text-center" tone="neutral">
                No residents match the current search.
              </StateMessage>
            ) : null}
          </div>

          {residentForm ? (
            <aside className="rounded-2xl border border-orange-100 bg-orange-50 p-5 xl:sticky xl:top-4">
              <form onSubmit={handleResidentFormSubmit}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Edit Resident</h3>
                    <p className="mt-1 text-sm text-slate-600">{residentForm.id}</p>
                  </div>
                  <Button
                    disabled={isMutating}
                    onClick={() => setResidentForm(null)}
                    size="sm"
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  {[
                    ["fullName", "Full name"],
                    ["address", "Address"],
                    ["exactAddress", "Exact address"],
                    ["precinctNumber", "Precinct number"],
                    ["birthDate", "Birth date"],
                    ["civilStatus", "Civil status"],
                    ["occupation", "Occupation / employment"],
                    ["contactNumber", "Contact number"],
                    ["sitio", "Sitio"]
                  ].map(([name, label]) => (
                    <label className="space-y-2 text-sm font-semibold text-slate-700" key={name}>
                      {label}
                      <input
                        className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
                        name={name}
                        onChange={handleResidentFormChange}
                        required={name === "fullName" || name === "address"}
                        type={name === "birthDate" ? "date" : "text"}
                        value={residentForm[name]}
                      />
                    </label>
                  ))}

                  <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2 xl:col-span-1">
                    Safe tag / remarks
                    <textarea
                      className="min-h-24 w-full rounded-2xl border border-orange-100 bg-white px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
                      name="additionalInformation"
                      onChange={handleResidentFormChange}
                      value={residentForm.additionalInformation}
                    />
                  </label>
                </div>

                <Button className="mt-4" disabled={isMutating} type="submit">
                  Save resident
                </Button>
              </form>
            </aside>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow="Excel Import" title="Resident Registry Preview" />

          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleExcelPreview}>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Workbook
              <input
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-2xl file:border file:border-orange-200 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gov-800 hover:file:bg-orange-50"
                onChange={handleExcelFileChange}
                type="file"
              />
            </label>
            {selectedImportFile ? (
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Worksheet
                <select
                  className="w-full min-w-[16rem] rounded-2xl border border-orange-100 px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
                  disabled={isExcelImportSheetsLoading || excelImportSheetNames.length === 0}
                  onChange={handleExcelSheetChange}
                  value={selectedExcelImportSheet}
                >
                  {excelImportSheetNames.map((sheetName) => (
                    <option key={sheetName} value={sheetName}>
                      {sheetName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {selectedImportFile ? (
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Header row
                <input
                  className="w-28 rounded-2xl border border-orange-100 px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
                  min="1"
                  onChange={handleExcelHeaderRowChange}
                  type="number"
                  value={excelImportHeaderRowNumber}
                />
              </label>
            ) : null}
            {selectedImportFile ? (
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Import mode
                <select
                  className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
                  onChange={handleExcelModeChange}
                  value={excelImportMode}
                >
                  {importModeOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <Button
              disabled={
                !selectedImportFile ||
                !selectedExcelImportSheet ||
                isExcelImportSheetsLoading ||
                isExcelImportPreviewLoading ||
                isExcelImportCommitLoading
              }
              size="lg"
              type="submit"
            >
              {isExcelImportPreviewLoading ? "Previewing" : "Preview"}
            </Button>
          </form>
        </div>

        {isExcelImportSheetsLoading ? (
          <StateMessage className="mt-4" tone="info">
            Reading workbook worksheets...
          </StateMessage>
        ) : null}

        {excelImportError ? (
          <StateMessage className="mt-4" tone="danger">
            {excelImportError}
          </StateMessage>
        ) : null}

        {selectedImportFile && excelImportHeaders.length > 0 ? (
          <div className="mt-5 border-y border-orange-100 py-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">
                  Column Mapping
                </h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {importMappingFields.map(([field, label]) => (
                    <label className="space-y-2 text-sm font-semibold text-slate-700" key={field}>
                      {label}
                      <select
                        className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
                        name={field}
                        onChange={handleExcelMappingChange}
                        value={excelImportColumnMapping[field] ?? ""}
                      >
                        <option value="">Unmapped</option>
                        {excelImportHeaders.map((header) => (
                          <option key={`${field}-${header.column}`} value={header.column}>
                            {header.column}
                            {header.header ? ` - ${header.header}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Voter status default
                <select
                  className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
                  name="voterStatus"
                  onChange={handleExcelSheetDefaultChange}
                  value={excelImportSheetDefaults.voterStatus ?? ""}
                >
                  <option value="">No default</option>
                  <option value="Voter">Voter</option>
                  <option value="Non-voter">Non-voter</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {excelImportPreview ? (
          <div className="mt-5 space-y-5">
            <dl className="grid gap-4 border-y border-orange-100 py-4 md:grid-cols-6">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gov-700">
                  Worksheet
                </dt>
                <dd className="mt-2 text-lg font-black text-slate-900">
                  {excelImportPreview.sheetName}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gov-700">
                  Rows
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {importSummary.totalRows}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gov-700">
                  New
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {importSummary.newResidents}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gov-700">
                  Duplicates
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {importSummary.duplicatesSkipped}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gov-700">
                  Updates
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {importSummary.updateCandidates}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gov-700">
                  Invalid
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {importSummary.invalidRows}
                </dd>
              </div>
            </dl>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">
                  Ignored Columns
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ignoredImportColumns.map((column) => (
                    <span
                      className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-gov-800"
                      key={column.column}
                    >
                      {column.column}: {column.reason}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">
                  Assistance Pairs
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {documentRequestPairs.map((pair) => (
                    <span
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                      key={`${pair.assistanceColumn}-${pair.dateColumn}`}
                    >
                      {pair.assistanceColumn}/{pair.dateColumn}
                    </span>
                  ))}
                  {documentRequestPairs.length === 0 ? (
                    <span className="text-sm text-slate-600">None detected.</span>
                  ) : null}
                </div>
              </div>
            </div>

            {excelImportErrors.length > 0 ? (
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-rose-700">
                  Errors
                </h3>
                <div className="mt-3 overflow-hidden rounded-2xl border border-rose-100">
                  <table className="min-w-full divide-y divide-rose-100 text-left text-sm">
                    <thead className="bg-rose-50 text-xs font-semibold uppercase tracking-[0.12em] text-rose-800">
                      <tr>
                        <th className="px-4 py-3">Row</th>
                        <th className="px-4 py-3">Field</th>
                        <th className="px-4 py-3">Issue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 bg-white">
                      {excelImportErrors.slice(0, 8).map((errorItem) => (
                        <tr key={`${errorItem.rowNumber}-${errorItem.code}`}>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {errorItem.rowNumber}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{errorItem.field}</td>
                          <td className="px-4 py-3 text-slate-700">{errorItem.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {excelImportWarnings.length > 0 ? (
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">
                  Warnings
                </h3>
                <div className="mt-3 overflow-hidden rounded-2xl border border-amber-100">
                  <table className="min-w-full divide-y divide-amber-100 text-left text-sm">
                    <thead className="bg-amber-50 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                      <tr>
                        <th className="px-4 py-3">Row</th>
                        <th className="px-4 py-3">Field</th>
                        <th className="px-4 py-3">Issue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 bg-white">
                      {excelImportWarnings.slice(0, 8).map((warning) => (
                        <tr key={`${warning.rowNumber}-${warning.code}-${warning.field}`}>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {warning.rowNumber}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{warning.field}</td>
                          <td className="px-4 py-3 text-slate-700">{warning.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">
                Preview Rows
              </h3>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-orange-100">
                <table className="min-w-[72rem] divide-y divide-orange-100 text-left text-sm">
                  <thead className="bg-orange-50 text-xs font-semibold uppercase tracking-[0.12em] text-gov-800">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Address</th>
                      <th className="px-4 py-3">Exact Address</th>
                      <th className="px-4 py-3">Birthday</th>
                      <th className="px-4 py-3">Civil Status</th>
                      <th className="px-4 py-3">Employment</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Precinct</th>
                      <th className="px-4 py-3">History</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100 bg-white">
                    {excelImportRows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.rowNumber}</td>
                        <td className="px-4 py-3 text-slate-700">{row.importStatus || "new"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.fullName || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.address || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.exactAddress || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.birthDateDisplay || row.birthDate || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.civilStatus || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.employment || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.contactNumber || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.precinctNo || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.documentRequestHistoryPreview.length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <form className="border-t border-orange-100 pt-5" onSubmit={handleExcelCommit}>
              <div className="grid gap-3 lg:grid-cols-2">
                <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                  <input
                    checked={excelImportConfirmations.importConfirmed}
                    className="mt-1 h-4 w-4 rounded border-orange-200 text-gov-700 focus:ring-gov-500"
                    name="importConfirmed"
                    onChange={handleExcelImportConfirmationChange}
                    type="checkbox"
                  />
                  <span>I confirm this preview is ready to import valid resident rows.</span>
                </label>
                <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                  <input
                    checked={excelImportConfirmations.backupConfirmed}
                    className="mt-1 h-4 w-4 rounded border-orange-200 text-gov-700 focus:ring-gov-500"
                    name="backupConfirmed"
                    onChange={handleExcelImportConfirmationChange}
                    type="checkbox"
                  />
                  <span>I confirm a database backup was created before this import.</span>
                </label>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  disabled={
                    !selectedImportFile ||
                    !previewedImportFile ||
                    selectedImportFile !== previewedImportFile ||
                    !selectedExcelImportSheet ||
                    !excelImportConfirmations.importConfirmed ||
                    !excelImportConfirmations.backupConfirmed ||
                    isExcelImportPreviewLoading ||
                    isExcelImportCommitLoading
                  }
                  size="lg"
                  type="submit"
                >
                  {isExcelImportCommitLoading ? "Importing" : "Commit Import"}
                </Button>
                <p className="text-sm font-semibold text-slate-600">
                  Valid rows import; duplicate and invalid rows stay skipped.
                </p>
              </div>
            </form>
          </div>
        ) : null}

        {excelImportCommitSummary ? (
          <div className="mt-5 border-t border-emerald-100 pt-5">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">
              Import Summary
            </h3>
            <dl className="mt-3 grid gap-4 md:grid-cols-6">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Rows
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {excelImportCommitSummary.rowsDetected}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Created
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {excelImportCommitSummary.created}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Updated
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {excelImportCommitSummary.updated ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Duplicates
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {excelImportCommitSummary.skippedDuplicates}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Failed
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {excelImportCommitSummary.failedValidation}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  History
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {excelImportCommitSummary.documentHistoryCreated}
                </dd>
              </div>
            </dl>
            {excelImportCommitSummary.documentHistoryDeferred ? (
              <StateMessage className="mt-4" tone="info">
                {excelImportCommitSummary.documentHistoryDeferred} assistance history item
                {excelImportCommitSummary.documentHistoryDeferred === 1 ? "" : "s"} deferred.
              </StateMessage>
            ) : null}
            {excelImportCommitSummary.undoSummary ? (
              <StateMessage className="mt-4" tone="info">
                Undo complete. {excelImportCommitSummary.undoSummary.archivedCreated} created
                resident{excelImportCommitSummary.undoSummary.archivedCreated === 1 ? "" : "s"} archived and{" "}
                {excelImportCommitSummary.undoSummary.restoredUpdated} update
                {excelImportCommitSummary.undoSummary.restoredUpdated === 1 ? "" : "s"} restored.
              </StateMessage>
            ) : null}
            {excelImportCommitSummary.importBatchId ? (
              <div className="mt-4">
                <Button
                  disabled={excelImportCommitSummary.undone || isExcelImportUndoLoading}
                  onClick={handleUndoImport}
                  type="button"
                  variant="secondary"
                >
                  {isExcelImportUndoLoading ? "Undoing" : "Undo Import"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard>
        <SectionHeader eyebrow="Provision Account" title="Create Staff Access" />

        <form className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_12rem_1fr_auto]" onSubmit={handleCreateAccount}>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Display name
            <input
              className="w-full rounded-2xl border border-orange-100 px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
              name="displayName"
              onChange={handleAccountFormChange}
              required
              value={accountForm.displayName}
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Username
            <input
              className="w-full rounded-2xl border border-orange-100 px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
              name="username"
              onChange={handleAccountFormChange}
              required
              value={accountForm.username}
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Role
            <select
              className="w-full rounded-2xl border border-orange-100 px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
              name="role"
              onChange={handleAccountFormChange}
              value={accountForm.role}
            >
              <option value="department">Department</option>
              <option value="lupon">Lupon</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Temporary password
            <input
              className="w-full rounded-2xl border border-orange-100 px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
              minLength={8}
              name="temporaryPassword"
              onChange={handleAccountFormChange}
              required
              type="password"
              value={accountForm.temporaryPassword}
            />
          </label>

          <div className="flex items-end">
            <Button className="w-full lg:w-auto" disabled={isMutating} size="lg" type="submit">
              Create
            </Button>
          </div>
        </form>
      </SectionCard>

      <section className="grid gap-5 xl:grid-cols-3">
        {accountGroups.map((group) => (
          <SectionCard className="overflow-hidden" key={group.role} padding="none">
            <div className="flex items-center justify-between gap-4 bg-orange-50 px-5 py-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">{group.label}</h3>
                <p className="text-sm text-slate-600">
                  {group.count} account{group.count === 1 ? "" : "s"}
                </p>
              </div>
              <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gov-700">
                {group.label}
              </span>
            </div>

            <div className="divide-y divide-orange-100">
              {group.accounts.map((account) => (
                <article className="p-5" key={account.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{account.name}</p>
                      <p className="mt-1 text-sm text-slate-600">@{account.username}</p>
                      <p
                        className={`mt-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                          account.status === "disabled" ? "text-rose-700" : "text-emerald-700"
                        }`}
                      >
                        {account.status === "disabled" ? "Disabled" : "Active"}
                      </p>
                      {account.createdAt ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Created {String(account.createdAt).slice(0, 10)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={isMutating}
                      onClick={() =>
                        onToggleAccountStatus?.(
                          account.id,
                          account.status === "disabled" ? "active" : "disabled"
                        )
                      }
                      size="sm"
                      variant={account.status === "disabled" ? "secondary" : "quiet"}
                    >
                      {account.status === "disabled" ? "Reactivate" : "Deactivate"}
                    </Button>
                    <Button
                      disabled={isMutating}
                      onClick={() => openResetForm(account.id)}
                      size="sm"
                      variant="quiet"
                    >
                      Reset password
                    </Button>
                  </div>

                  {resetForm.profileId === account.id ? (
                    <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleResetPassword}>
                      <input
                        className="min-w-0 flex-1 rounded-2xl border border-orange-100 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
                        minLength={8}
                        onChange={(event) =>
                          setResetForm((current) => ({
                            ...current,
                            temporaryPassword: event.target.value
                          }))
                        }
                        required
                        type="password"
                        value={resetForm.temporaryPassword}
                      />
                      <Button disabled={isMutating} size="sm" type="submit">
                        Save
                      </Button>
                      <Button
                        disabled={isMutating}
                        onClick={() => setResetForm({ profileId: "", temporaryPassword: "" })}
                        size="sm"
                        variant="quiet"
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : null}
                </article>
              ))}

              {group.accounts.length === 0 ? (
                <StateMessage className="rounded-none border-0 bg-white px-5 py-8 text-center" tone="neutral">
                  No database profiles assigned to this role.
                </StateMessage>
              ) : null}
            </div>
          </SectionCard>
        ))}
      </section>
    </div>
  );
}
