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

export default function AdminPanel({
  actionError = "",
  actionMessage = "",
  documentRequests,
  excelImportError = "",
  excelImportPreview = null,
  error = "",
  isExcelImportPreviewLoading = false,
  isLoading = false,
  isMutating = false,
  onCreateAccount,
  onPreviewExcelImport,
  onResetPassword,
  onToggleAccountStatus,
  residents,
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
  const accountGroups = getAccountGroups(users);
  const counters = getAdminCounters({ users, residents, documentRequests });
  const excelImportRows = excelImportPreview?.previewRows ?? [];
  const excelImportErrors = excelImportPreview?.errors ?? [];
  const excelImportWarnings = excelImportPreview?.warnings ?? [];
  const ignoredImportColumns = excelImportPreview?.ignoredColumns ?? [];
  const documentRequestPairs = excelImportPreview?.documentRequestPairsDetected ?? [];

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
    await onPreviewExcelImport?.(selectedImportFile);
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
          <SectionHeader eyebrow="Excel Import" title="Resident Registry Preview" />

          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleExcelPreview}>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Workbook
              <input
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-2xl file:border file:border-orange-200 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gov-800 hover:file:bg-orange-50"
                onChange={(event) => setSelectedImportFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
            <Button
              disabled={!selectedImportFile || isExcelImportPreviewLoading}
              size="lg"
              type="submit"
            >
              {isExcelImportPreviewLoading ? "Previewing" : "Preview"}
            </Button>
          </form>
        </div>

        {excelImportError ? (
          <StateMessage className="mt-4" tone="danger">
            {excelImportError}
          </StateMessage>
        ) : null}

        {excelImportPreview ? (
          <div className="mt-5 space-y-5">
            <dl className="grid gap-4 border-y border-orange-100 py-4 md:grid-cols-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gov-700">
                  Rows
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {excelImportPreview.totalRowsDetected}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gov-700">
                  Errors
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {excelImportErrors.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gov-700">
                  Warnings
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {excelImportWarnings.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gov-700">
                  Request Pairs
                </dt>
                <dd className="mt-2 text-2xl font-black text-slate-900">
                  {documentRequestPairs.length}
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
                <table className="min-w-[60rem] divide-y divide-orange-100 text-left text-sm">
                  <thead className="bg-orange-50 text-xs font-semibold uppercase tracking-[0.12em] text-gov-800">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Address</th>
                      <th className="px-4 py-3">Exact Address</th>
                      <th className="px-4 py-3">Birthday</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Precinct</th>
                      <th className="px-4 py-3">History</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100 bg-white">
                    {excelImportRows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.rowNumber}</td>
                        <td className="px-4 py-3 text-slate-700">{row.fullName || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.address || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.exactAddress || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.birthDate || "-"}</td>
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
