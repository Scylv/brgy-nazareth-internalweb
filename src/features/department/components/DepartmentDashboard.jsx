import { useState } from "react";
import StatusBadge from "../../../shared/components/StatusBadge";
import {
  countDocumentRequestsByType,
  getDocumentRequestsThisMonth,
  getExpiringSoonCount,
  getRecentDocumentRequests,
  getTotalDocumentRequests
} from "../../../shared/lib/documentRequests";
import { RESIDENT_STATUS_FILTERS } from "../../../shared/lib/filterResidents";

const statusFilterLabels = {
  all: "All",
  green: "Green",
  yellow: "Yellow",
  red: "Red"
};

const blankDocumentRequest = {
  id: "",
  residentId: "",
  documentType: "Barangay Clearance",
  purpose: "",
  requestDate: new Date().toISOString().slice(0, 10),
  releaseDate: "",
  expiryDate: "",
  status: "Processing",
  processedBy: ""
};

const documentTypeOptions = [
  "Barangay Clearance",
  "Barangay Indigency",
  "Barangay ID",
  "Certificate of Residency"
];

const statusOptions = ["Processing", "Released", "On Hold", "Cancelled"];

export default function DepartmentDashboard({
  documentRequests,
  onDocumentRequestSave,
  query,
  results,
  residents,
  onQueryChange,
  onSelectResident,
  onStatusFilterChange,
  statusFilter
}) {
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState(blankDocumentRequest);
  const documentTypeCounts = countDocumentRequestsByType(documentRequests);
  const recentRequests = getRecentDocumentRequests(documentRequests, 4);

  function getResidentName(residentId) {
    return residents.find((resident) => resident.id === residentId)?.name ?? residentId;
  }

  function openNewDocumentRequestForm() {
    setDocumentForm({
      ...blankDocumentRequest,
      residentId: residents[0]?.id ?? ""
    });
    setIsDocumentFormOpen(true);
  }

  function openEditDocumentRequestForm(request) {
    setDocumentForm(request);
    setIsDocumentFormOpen(true);
  }

  function handleDocumentFormChange(event) {
    const { name, value } = event.target;
    setDocumentForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleDocumentFormSubmit(event) {
    event.preventDefault();
    onDocumentRequestSave(documentForm);
    setDocumentForm(blankDocumentRequest);
    setIsDocumentFormOpen(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-6">
        <h2 className="text-2xl font-black text-slate-900">Resident Search</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Search by resident name or RBI ID and review only the verification result
          required for clearance handling.
        </p>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
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

        <div className="mt-4 flex flex-wrap gap-2">
          {RESIDENT_STATUS_FILTERS.map((filter) => (
            <button
              className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                statusFilter === filter
                  ? "border-gov-700 bg-gov-700 text-white"
                  : "border-orange-100 bg-white text-slate-700 hover:border-gov-300"
              }`}
              key={filter}
              onClick={() => onStatusFilterChange(filter)}
              type="button"
            >
              {statusFilterLabels[filter]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-orange-100 bg-white p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gov-700">
              Document Requests
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Department Metrics</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-500">Non-confidential request fields only</p>
            <button
              className="rounded-2xl bg-gov-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gov-800"
              onClick={openNewDocumentRequestForm}
              type="button"
            >
              New Document Request
            </button>
          </div>
        </div>

        {isDocumentFormOpen ? (
          <form
            className="mt-5 rounded-[1.5rem] border border-orange-100 bg-orange-50 p-5"
            onSubmit={handleDocumentFormSubmit}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-black text-slate-900">
                {documentForm.id ? "Update Document Request" : "New Document Request"}
              </h3>
              <button
                className="rounded-2xl border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300"
                onClick={() => setIsDocumentFormOpen(false)}
                type="button"
              >
                Cancel
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Document Type</span>
                <select
                  className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                  name="documentType"
                  onChange={handleDocumentFormChange}
                  value={documentForm.documentType}
                >
                  {documentTypeOptions.map((documentType) => (
                    <option key={documentType} value={documentType}>
                      {documentType}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">Purpose</span>
                <input
                  className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                  name="purpose"
                  onChange={handleDocumentFormChange}
                  required
                  value={documentForm.purpose}
                />
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
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">Processed By</span>
                <input
                  className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                  name="processedBy"
                  onChange={handleDocumentFormChange}
                  required
                  value={documentForm.processedBy}
                />
              </label>
            </div>

            <button
              className="mt-4 rounded-2xl bg-gov-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gov-800"
              type="submit"
            >
              {documentForm.id ? "Save Changes" : "Create Request"}
            </button>
          </form>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-[1.25rem] border border-orange-100 bg-orange-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gov-700">Total</p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {getTotalDocumentRequests(documentRequests)}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-sky-100 bg-sky-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">This Month</p>
            <p className="mt-2 text-2xl font-black text-sky-900">
              {getDocumentRequestsThisMonth(documentRequests)}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Expiring Soon</p>
            <p className="mt-2 text-2xl font-black text-amber-900">
              {getExpiringSoonCount(documentRequests)}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Types</p>
            <p className="mt-2 text-2xl font-black text-emerald-900">
              {Object.keys(documentTypeCounts).length}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Requests</h3>
            <div className="mt-3 space-y-3">
              {recentRequests.map((request) => (
                <div className="rounded-2xl border border-orange-100 px-4 py-3" key={request.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{request.documentType}</p>
                    <span className="text-xs font-semibold text-slate-500">{request.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{getResidentName(request.residentId)}</p>
                  <button
                    className="mt-3 rounded-xl border border-orange-200 px-3 py-1.5 text-xs font-semibold text-gov-800 transition hover:bg-orange-50"
                    onClick={() => openEditDocumentRequestForm(request)}
                    type="button"
                  >
                    Edit Request
                  </button>
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
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Green</p>
          <p className="mt-3 text-2xl font-black text-emerald-900">Proceed</p>
          <p className="mt-2 text-sm text-emerald-800">Cleared for release outside the system.</p>
        </div>
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Yellow</p>
          <p className="mt-3 text-2xl font-black text-amber-900">Refer</p>
          <p className="mt-2 text-sm text-amber-800">Refer the resident to the Lupon office.</p>
        </div>
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">Red</p>
          <p className="mt-3 text-2xl font-black text-rose-900">Refer</p>
          <p className="mt-2 text-sm text-rose-800">Lupon handling is required before clearance proceeds.</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border border-orange-100">
        <div className="grid gap-px bg-orange-100">
          <div className="grid grid-cols-[1.4fr_1fr_auto] gap-4 bg-orange-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gov-700">
            <span>Resident</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {results.map((resident) => (
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
                <button
                  className="rounded-2xl bg-gov-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gov-800"
                  onClick={() => onSelectResident(resident.id)}
                  type="button"
                >
                  Verify
                </button>
              </div>
            </div>
          ))}

          {results.length === 0 ? (
            <div className="bg-white px-5 py-8 text-center text-sm text-slate-500">
              No residents match the current search and status filter.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
