import { useState } from "react";
import Button from "../../../shared/components/Button";
import MetricCard from "../../../shared/components/MetricCard";
import Notice from "../../../shared/components/Notice";
import RequestStatusBadge from "../../../shared/components/RequestStatusBadge";
import SectionCard from "../../../shared/components/SectionCard";
import SectionHeader from "../../../shared/components/SectionHeader";
import StateMessage from "../../../shared/components/StateMessage";
import StatusBadge from "../../../shared/components/StatusBadge";
import {
  barangayDocumentOptions,
  documentRequestStatusOptions
} from "../api/documentRequestsApi";
import {
  countDocumentRequestsByType,
  getDocumentRequestsThisMonth,
  getExpiringSoonCount,
  getRecentDocumentRequests,
  getTotalDocumentRequests
} from "../../../shared/lib/documentRequests";
import {
  getResidentStatusCounts,
  RESIDENT_STATUS_FILTERS,
  searchResidents
} from "../../../shared/lib/filterResidents";

const statusFilterLabels = {
  all: "All",
  green: "Green",
  yellow: "Yellow",
  red: "Red"
};

const blankDocumentRequest = {
  id: "",
  residentId: "",
  barangayDocumentId: "BDOC-001",
  documentType: "Barangay Clearance",
  purpose: "",
  requestDate: new Date().toISOString().slice(0, 10),
  releaseDate: "",
  expiryDate: "",
  status: "pending",
  processedBy: ""
};

export default function DepartmentDashboard({
  defaultProcessedBy = "",
  documentRequestError,
  isDocumentRequestLoading,
  documentRequests,
  onDocumentRequestSave,
  query,
  results,
  residentDataSource,
  residentError,
  residentSearchResidents,
  residents,
  isResidentLoading,
  onQueryChange,
  onSelectResident,
  onStatusFilterChange,
  statusFilter
}) {
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState(blankDocumentRequest);
  const documentTypeCounts = countDocumentRequestsByType(documentRequests);
  const recentRequests = getRecentDocumentRequests(documentRequests, 4);
  const searchResidentList = residentSearchResidents ?? residents;
  const statusCounts = getResidentStatusCounts(searchResidents(query, searchResidentList));

  function getResidentName(residentId) {
    return residents.find((resident) => resident.id === residentId)?.name ?? residentId;
  }

  function openNewDocumentRequestForm() {
    setDocumentForm({
      ...blankDocumentRequest,
      barangayDocumentId: barangayDocumentOptions[0]?.id ?? "",
      documentType: barangayDocumentOptions[0]?.name ?? "",
      processedBy: defaultProcessedBy,
      residentId: residents[0]?.id ?? "",
      status: "pending"
    });
    setIsDocumentFormOpen(true);
  }

  function openEditDocumentRequestForm(request) {
    setDocumentForm(request);
    setIsDocumentFormOpen(true);
  }

  function handleDocumentFormChange(event) {
    const { name, value } = event.target;

    if (name === "barangayDocumentId") {
      const selectedDocument = barangayDocumentOptions.find((document) => document.id === value);

      setDocumentForm((current) => ({
        ...current,
        barangayDocumentId: value,
        documentType: selectedDocument?.name ?? current.documentType
      }));
      return;
    }

    setDocumentForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleDocumentFormSubmit(event) {
    event.preventDefault();
    const savedRequest = await onDocumentRequestSave(documentForm);

    if (savedRequest === false) {
      return;
    }

    setDocumentForm(blankDocumentRequest);
    setIsDocumentFormOpen(false);
  }

  return (
    <div className="space-y-6">
      <SectionCard padding="compact" variant="hero">
        <SectionHeader title="Resident Search" />
        <Notice className="mt-3 inline-flex max-w-full" tone="info">
          Department view: basic resident details, address, status color, and document requests only.
        </Notice>

        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            className="flex-1 rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search resident by name or RBI ID"
            value={query}
          />
          <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
            {results.length} resident{results.length === 1 ? "" : "s"} found
          </div>
        </div>

        {residentDataSource ? (
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Data source: {residentDataSource}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {RESIDENT_STATUS_FILTERS.map((filter) => (
            <button
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                statusFilter === filter
                  ? "border-gov-700 bg-gov-700 text-white"
                  : "border-orange-100 bg-white text-slate-700 hover:border-gov-300"
              }`}
              key={filter}
              onClick={() => onStatusFilterChange(filter)}
              type="button"
            >
              <span>{statusFilterLabels[filter]}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  statusFilter === filter ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {statusCounts[filter]}
              </span>
            </button>
          ))}
          <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
            <span>Lupon Referral</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
              {statusCounts.luponReferral}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800">
            <span className="font-semibold">Green:</span> Cleared - proceed
          </div>
          <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-900">
            <span className="font-semibold">Yellow:</span> Needs Lupon review
          </div>
          <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-800">
            <span className="font-semibold">Red:</span> Hold - Lupon required
          </div>
        </div>
      </SectionCard>

      <SectionCard className="overflow-hidden lg:max-h-[48vh] lg:overflow-y-auto" padding="none">
        <div className="grid gap-px bg-orange-100">
          <div className="grid grid-cols-[1.4fr_1fr_auto] gap-4 bg-orange-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gov-700">
            <span>Resident</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {isResidentLoading ? (
            <StateMessage className="rounded-none border-0 bg-white px-5 py-8 text-center" tone="neutral">
              Loading residents from the database API...
            </StateMessage>
          ) : null}

          {!isResidentLoading && residentError ? (
            <StateMessage className="rounded-none border-0 bg-white px-5 py-8 text-center" tone="danger">
              {residentError}
            </StateMessage>
          ) : null}

          {!isResidentLoading && !residentError
            ? results.map((resident) => (
                <div
                  className="grid grid-cols-1 gap-4 bg-white px-5 py-4 md:grid-cols-[1.4fr_1fr_auto]"
                  key={resident.id}
                >
                  <div>
                    <div className="font-semibold text-slate-900">{resident.name}</div>
                    <div className="text-sm text-slate-600">{resident.id}</div>
                    <div className="text-sm text-slate-500">{resident.address}</div>
                  </div>

                  <div className="flex items-center">
                    <StatusBadge status={resident.status} />
                  </div>

                  <div className="flex items-center">
                    <Button onClick={() => onSelectResident(resident.id)}>
                      Verify
                    </Button>
                  </div>
                </div>
              ))
            : null}

          {!isResidentLoading && !residentError && results.length === 0 ? (
            <StateMessage className="rounded-none border-0 bg-white px-5 py-8 text-center" tone="neutral">
              No residents match the current search and status filter.
            </StateMessage>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          actions={
            <Button
              disabled={isDocumentRequestLoading || residents.length === 0}
              onClick={openNewDocumentRequestForm}
            >
              New Document Request
            </Button>
          }
          eyebrow="Document Requests"
          title="Document Request Summary"
        />

        {isDocumentRequestLoading ? (
          <StateMessage className="mt-4" tone="info">
            Loading document requests from the database API...
          </StateMessage>
        ) : null}

        {documentRequestError ? (
          <StateMessage className="mt-4" tone="danger">
            {documentRequestError}
          </StateMessage>
        ) : null}

        <div
          className={`mt-5 grid gap-5 ${
            isDocumentFormOpen ? "lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)] lg:items-start" : ""
          }`}
        >
          <div>
            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard label="Total" tone="orange" value={getTotalDocumentRequests(documentRequests)} />
              <MetricCard label="This Month" tone="sky" value={getDocumentRequestsThisMonth(documentRequests)} />
              <MetricCard label="Expiring Soon" tone="amber" value={getExpiringSoonCount(documentRequests)} />
              <MetricCard label="Types" tone="emerald" value={Object.keys(documentTypeCounts).length} />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Requests</h3>
                <div className="mt-3 space-y-3">
                  {recentRequests.map((request) => (
                    <div className="rounded-2xl border border-orange-100 px-4 py-3" key={request.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{request.documentType}</p>
                        <RequestStatusBadge status={request.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{getResidentName(request.residentId)}</p>
                      <Button
                        className="mt-3"
                        onClick={() => openEditDocumentRequestForm(request)}
                        size="sm"
                        variant="secondary"
                      >
                        Edit Request
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">By Document Type</h3>
                <div className="mt-3 space-y-3">
                  {Object.entries(documentTypeCounts).map(([documentType, count]) => (
                    <div
                      className="flex items-center justify-between gap-4 rounded-2xl border border-orange-100 px-4 py-3 text-sm"
                      key={documentType}
                    >
                      <span className="font-medium text-slate-700">{documentType}</span>
                      <span className="font-black text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {isDocumentFormOpen ? (
            <aside className="rounded-2xl border border-orange-100 bg-orange-50 p-5 lg:sticky lg:top-4">
              <form onSubmit={handleDocumentFormSubmit}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-black text-slate-900">
                    {documentForm.id ? "Update Document Request" : "New Document Request"}
                  </h3>
                  <Button onClick={() => setIsDocumentFormOpen(false)} variant="secondary">
                    Cancel
                  </Button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Resident</span>
                    <select
                      className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                      name="residentId"
                      onChange={handleDocumentFormChange}
                      required
                      value={documentForm.residentId}
                    >
                      {residents.map((resident) => (
                        <option key={resident.id} value={resident.id}>
                          {resident.name} ({resident.id})
                        </option>
                      ))}
                      {residents.length === 0 ? (
                        <option disabled value="">
                          No residents loaded
                        </option>
                      ) : null}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Document Type</span>
                    <select
                      className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                      name="barangayDocumentId"
                      onChange={handleDocumentFormChange}
                      value={documentForm.barangayDocumentId}
                    >
                      {barangayDocumentOptions.map((documentType) => (
                        <option key={documentType.id} value={documentType.id}>
                          {documentType.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block md:col-span-2 lg:col-span-1">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Purpose</span>
                    <input
                      className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                      name="purpose"
                      onChange={handleDocumentFormChange}
                      required
                      value={documentForm.purpose}
                    />
                    <span className="mt-2 block text-xs text-slate-500">
                      Keep this non-confidential for Department processing records.
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Request Date</span>
                    <input
                      className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                      name="requestDate"
                      onChange={handleDocumentFormChange}
                      required
                      type="date"
                      value={documentForm.requestDate}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Release Date</span>
                    <input
                      className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                      name="releaseDate"
                      onChange={handleDocumentFormChange}
                      type="date"
                      value={documentForm.releaseDate}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Expiry Date</span>
                    <input
                      className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                      name="expiryDate"
                      onChange={handleDocumentFormChange}
                      type="date"
                      value={documentForm.expiryDate}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
                    <select
                      className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                      name="status"
                      onChange={handleDocumentFormChange}
                      value={documentForm.status}
                    >
                      {documentRequestStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block md:col-span-2 lg:col-span-1">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Processed By</span>
                    <input
                      className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                      name="processedBy"
                      onChange={handleDocumentFormChange}
                      readOnly
                      value={documentForm.processedBy}
                    />
                    <span className="mt-2 block text-xs text-slate-500">
                      Filled from the signed-in Department account.
                    </span>
                  </label>
                </div>

                <Button className="mt-4" disabled={isDocumentRequestLoading} type="submit">
                  {documentForm.id ? "Save Changes" : "Create Request"}
                </Button>
              </form>
            </aside>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
