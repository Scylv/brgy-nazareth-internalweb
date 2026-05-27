import { useEffect, useState } from "react";
import Button from "../../../shared/components/Button";
import MetricCard from "../../../shared/components/MetricCard";
import Notice from "../../../shared/components/Notice";
import PaginationControls from "../../../shared/components/PaginationControls";
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
  getExpiringSoonCount,
  getTotalDocumentRequests
} from "../../../shared/lib/documentRequests";
import {
  getResidentStatusCounts,
  RESIDENT_STATUS_FILTERS,
  searchResidents
} from "../../../shared/lib/filterResidents";
import { getNextPage, getPaginatedItems, getPreviousPage } from "../../../shared/lib/pagination";

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
  customDocumentTitle: "",
  purpose: "",
  requestDate: new Date().toISOString().slice(0, 10),
  releaseDate: "",
  expiryDate: "",
  status: "pending",
  processedBy: ""
};
const residentSearchPageSize = 5;
const documentRequestPageSize = 5;
const archiveReasons = [
  "Duplicate request",
  "Wrong resident",
  "Wrong document type",
  "Created by mistake",
  "Other"
];

export default function DepartmentDashboard({
  defaultProcessedBy = "",
  documentRequestError,
  isDocumentRequestLoading,
  documentRequests,
  initialArchiveConfirmationId = "",
  initialDocumentForm = {},
  initialDocumentFormError = "",
  initialDocumentFormOpen = false,
  initialDocumentRequestPage = 1,
  initialResidentPickerSearch = "",
  initialReleaseConfirmationId = "",
  initialRequestDocumentTypeFilter = "all",
  initialRequestSearch = "",
  initialRequestStatusFilter = "all",
  onDocumentRequestArchive = async () => false,
  onDocumentRequestMarkProcessing = async () => false,
  onDocumentRequestMarkReleased = async () => false,
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
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(initialDocumentFormOpen);
  const [documentForm, setDocumentForm] = useState({
    ...blankDocumentRequest,
    ...initialDocumentForm
  });
  const [documentFormError, setDocumentFormError] = useState(initialDocumentFormError);
  const [residentPickerSearch, setResidentPickerSearch] = useState(initialResidentPickerSearch);
  const [residentPage, setResidentPage] = useState(1);
  const [requestSearch, setRequestSearch] = useState(initialRequestSearch);
  const [requestStatusFilter, setRequestStatusFilter] = useState(initialRequestStatusFilter);
  const [requestDocumentTypeFilter, setRequestDocumentTypeFilter] = useState(
    initialRequestDocumentTypeFilter
  );
  const hasInitialRequestFilter =
    initialRequestSearch || initialRequestStatusFilter !== "all" || initialRequestDocumentTypeFilter !== "all";
  const [documentRequestPage, setDocumentRequestPage] = useState(
    hasInitialRequestFilter ? 1 : initialDocumentRequestPage
  );
  const [releaseConfirmationId, setReleaseConfirmationId] = useState(initialReleaseConfirmationId);
  const [archiveConfirmationId, setArchiveConfirmationId] = useState(initialArchiveConfirmationId);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveNote, setArchiveNote] = useState("");
  const activeDocumentRequests = documentRequests.filter((request) => !request.archived);
  const documentTypeCounts = countDocumentRequestsByType(activeDocumentRequests);
  const searchResidentList = residentSearchResidents ?? residents;
  const statusCounts = getResidentStatusCounts(searchResidents(query, searchResidentList));
  const documentTypeFilterOptions = Array.from(
    new Set(activeDocumentRequests.map((request) => request.documentType).filter(Boolean))
  ).sort();
  const selectedDocumentFormResident =
    residents.find((resident) => resident.id === documentForm.residentId) ?? null;
  const residentPickerQuery = residentPickerSearch.trim().toLowerCase();
  const residentPickerResults = residents
    .filter((resident) => {
      if (!residentPickerQuery) {
        return true;
      }

      return [resident.name, resident.id].join(" ").toLowerCase().includes(residentPickerQuery);
    })
    .slice(0, 5);
  const filteredDocumentRequests = activeDocumentRequests.filter((request) => {
    const residentName = getResidentName(request.residentId, request);
    const searchText = [
      request.displayDocumentType ?? request.documentType,
      residentName,
      request.purpose,
      request.requestDate,
      request.releaseDate,
      request.expiryDate,
      request.processedBy
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = searchText.includes(requestSearch.trim().toLowerCase());
    const matchesStatus = requestStatusFilter === "all" || request.status === requestStatusFilter;
    const matchesDocumentType =
      requestDocumentTypeFilter === "all" || request.documentType === requestDocumentTypeFilter;

    return matchesSearch && matchesStatus && matchesDocumentType;
  });
  const paginatedResults = getPaginatedItems(results, {
    page: residentPage,
    pageSize: residentSearchPageSize
  });
  const paginatedDocumentRequests = getPaginatedItems(filteredDocumentRequests, {
    page: documentRequestPage,
    pageSize: documentRequestPageSize
  });
  const releaseConfirmationRequest = activeDocumentRequests.find(
    (request) => request.id === releaseConfirmationId
  );
  const archiveConfirmationRequest = activeDocumentRequests.find(
    (request) => request.id === archiveConfirmationId
  );

  useEffect(() => {
    setResidentPage(1);
  }, [query, statusFilter]);

  useEffect(() => {
    setDocumentRequestPage(1);
  }, [requestSearch, requestStatusFilter, requestDocumentTypeFilter]);

  useEffect(() => {
    if (residentPage !== paginatedResults.page) {
      setResidentPage(paginatedResults.page);
    }
  }, [paginatedResults.page, residentPage]);

  useEffect(() => {
    if (documentRequestPage !== paginatedDocumentRequests.page) {
      setDocumentRequestPage(paginatedDocumentRequests.page);
    }
  }, [documentRequestPage, paginatedDocumentRequests.page]);

  function getResidentName(residentId, request = null) {
    return request?.residentName || residents.find((resident) => resident.id === residentId)?.name || residentId;
  }

  function openNewDocumentRequestForm() {
    setDocumentForm({
      ...blankDocumentRequest,
      barangayDocumentId: barangayDocumentOptions[0]?.id ?? "",
      documentType: barangayDocumentOptions[0]?.name ?? "",
      processedBy: defaultProcessedBy,
      residentId: "",
      status: "pending"
    });
    setDocumentFormError("");
    setResidentPickerSearch("");
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
        documentType: selectedDocument?.name ?? current.documentType,
        customDocumentTitle: selectedDocument?.id === "BDOC-OTHER" ? current.customDocumentTitle : ""
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
    const validationError = validateDocumentForm(documentForm);

    if (validationError) {
      setDocumentFormError(validationError);
      return;
    }

    setDocumentFormError("");
    const savedRequest = await onDocumentRequestSave(documentForm);

    if (savedRequest === false) {
      return;
    }

    setDocumentForm(blankDocumentRequest);
    setIsDocumentFormOpen(false);
  }

  function selectDocumentFormResident(resident) {
    setDocumentForm((current) => ({
      ...current,
      residentId: resident.id
    }));
    setResidentPickerSearch(`${resident.name} ${resident.id}`);
    setDocumentFormError("");
  }

  function validateDocumentForm(form) {
    if (!form.residentId) {
      return "Select a resident before creating a request.";
    }

    if (!form.requestDate) {
      return "Request date is required.";
    }

    if (form.releaseDate && form.releaseDate < form.requestDate) {
      return "Release date cannot be before request date.";
    }

    if (form.expiryDate && form.expiryDate < form.requestDate) {
      return "Expiry date cannot be before request date.";
    }

    if (form.releaseDate && form.expiryDate && form.expiryDate < form.releaseDate) {
      return "Expiry date cannot be before release date.";
    }

    if (form.barangayDocumentId === "BDOC-OTHER" && !form.customDocumentTitle?.trim()) {
      return "Custom document title is required for Other requests.";
    }

    return "";
  }

  async function handleMarkProcessing(requestId) {
    await onDocumentRequestMarkProcessing(requestId);
  }

  async function handleConfirmRelease() {
    if (!releaseConfirmationRequest) {
      return;
    }

    const result = await onDocumentRequestMarkReleased(releaseConfirmationRequest.id);

    if (result !== false) {
      setReleaseConfirmationId("");
    }
  }

  async function handleConfirmArchive(event) {
    event.preventDefault();

    if (!archiveConfirmationRequest || !archiveReason) {
      return;
    }

    const result = await onDocumentRequestArchive(archiveConfirmationRequest.id, {
      reason: archiveReason,
      note: archiveNote
    });

    if (result !== false) {
      setArchiveConfirmationId("");
      setArchiveReason("");
      setArchiveNote("");
    }
  }

  function getRequestActions(request) {
    if (request.status === "pending") {
      return (
        <>
          <Button disabled={isDocumentRequestLoading} onClick={() => handleMarkProcessing(request.id)} size="sm" variant="secondary">
            Mark Processing
          </Button>
          <Button disabled={isDocumentRequestLoading} onClick={() => setReleaseConfirmationId(request.id)} size="sm">
            Mark Released
          </Button>
          <Button disabled={isDocumentRequestLoading} onClick={() => setArchiveConfirmationId(request.id)} size="sm" variant="quiet">
            Archive
          </Button>
        </>
      );
    }

    if (request.status === "processing") {
      return (
        <>
          <Button disabled={isDocumentRequestLoading} onClick={() => setReleaseConfirmationId(request.id)} size="sm">
            Mark Released
          </Button>
          <Button disabled={isDocumentRequestLoading} onClick={() => setArchiveConfirmationId(request.id)} size="sm" variant="quiet">
            Archive
          </Button>
        </>
      );
    }

    if (["released", "expired"].includes(request.status)) {
      return (
        <Button disabled={isDocumentRequestLoading} onClick={() => setArchiveConfirmationId(request.id)} size="sm" variant="quiet">
          Archive
        </Button>
      );
    }

    return null;
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
            ? paginatedResults.items.map((resident) => (
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
        <PaginationControls
          className="border-t border-orange-100 bg-white px-5 py-4"
          onNext={() =>
            setResidentPage((page) =>
              getNextPage({
                page,
                totalPages: paginatedResults.totalPages
              })
            )
          }
          onPrevious={() => setResidentPage((page) => getPreviousPage({ page }))}
          page={paginatedResults.page}
          totalPages={paginatedResults.totalPages}
        />
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

        <div className="mt-5">
          <div className="grid gap-3 md:grid-cols-5">
            <MetricCard label="Total" tone="orange" value={getTotalDocumentRequests(activeDocumentRequests)} />
            <MetricCard
              label="Pending"
              tone="amber"
              value={activeDocumentRequests.filter((request) => request.status === "pending").length}
            />
            <MetricCard
              label="Processing"
              tone="sky"
              value={activeDocumentRequests.filter((request) => request.status === "processing").length}
            />
            <MetricCard
              label="Released"
              tone="emerald"
              value={activeDocumentRequests.filter((request) => request.status === "released").length}
            />
            <MetricCard
              label="Expiring Soon"
              tone="amber"
              value={getExpiringSoonCount(activeDocumentRequests)}
            />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(16rem,1.5fr)_minmax(11rem,0.7fr)_minmax(13rem,0.9fr)]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Search requests</span>
              <input
                className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                onChange={(event) => setRequestSearch(event.target.value)}
                placeholder="Resident, purpose, date, or processor"
                value={requestSearch}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
              <select
                className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                onChange={(event) => setRequestStatusFilter(event.target.value)}
                value={requestStatusFilter}
              >
                <option value="all">All statuses</option>
                {documentRequestStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Document Type</span>
              <select
                className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                onChange={(event) => setRequestDocumentTypeFilter(event.target.value)}
                value={requestDocumentTypeFilter}
              >
                <option value="all">All document types</option>
                {documentTypeFilterOptions.map((documentType) => (
                  <option key={documentType} value={documentType}>
                    {documentType}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-600">
              {filteredDocumentRequests.length} request
              {filteredDocumentRequests.length === 1 ? "" : "s"} shown
            </p>
            <div className="text-sm text-slate-500">
              {Object.keys(documentTypeCounts).length} document type
              {Object.keys(documentTypeCounts).length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {paginatedDocumentRequests.items.map((request) => (
              <article className="rounded-2xl border border-orange-100 bg-white px-4 py-4" key={request.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">
                        {request.displayDocumentType ?? request.documentType}
                      </h3>
                      <RequestStatusBadge status={request.status} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {getResidentName(request.residentId, request)}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{request.purpose}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">{getRequestActions(request)}</div>
                </div>

                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <dt className="font-semibold text-slate-500">Request date</dt>
                    <dd className="text-slate-800">{request.requestDate || "Not set"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Release date</dt>
                    <dd className="text-slate-800">{request.releaseDate || "Not released"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Expiry date</dt>
                    <dd className="text-slate-800">{request.expiryDate || "No expiry"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Processed by</dt>
                    <dd className="text-slate-800">{request.processedBy || "Not assigned"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Request ID</dt>
                    <dd className="break-all text-slate-800">{request.id}</dd>
                  </div>
                </dl>
              </article>
            ))}

            {filteredDocumentRequests.length === 0 ? (
              <StateMessage tone="neutral">
                No active document requests match the current search and filters.
              </StateMessage>
            ) : null}
          </div>

          <PaginationControls
            className="mt-4"
            onNext={() =>
              setDocumentRequestPage((page) =>
                getNextPage({
                  page,
                  totalPages: paginatedDocumentRequests.totalPages
                })
              )
            }
            onPrevious={() => setDocumentRequestPage((page) => getPreviousPage({ page }))}
            page={paginatedDocumentRequests.page}
            totalPages={paginatedDocumentRequests.totalPages}
          />

          {isDocumentFormOpen ? (
            <aside className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-5">
              <form onSubmit={handleDocumentFormSubmit}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-black text-slate-900">
                    {documentForm.id ? "Update Document Request" : "New Document Request"}
                  </h3>
                  <Button onClick={() => setIsDocumentFormOpen(false)} variant="secondary">
                    Cancel
                  </Button>
                </div>

                {documentFormError ? (
                  <StateMessage className="mt-4" tone="danger">
                    {documentFormError}
                  </StateMessage>
                ) : null}

                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                  <div className="block md:col-span-2 lg:col-span-1">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Search resident</span>
                      <input
                        className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                        onChange={(event) => setResidentPickerSearch(event.target.value)}
                        placeholder="Search by resident name or RBI"
                        value={residentPickerSearch}
                      />
                    </label>

                    {selectedDocumentFormResident ? (
                      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                        <div className="font-semibold">Selected resident</div>
                        <div>{selectedDocumentFormResident.name}</div>
                        <div className="text-xs">{selectedDocumentFormResident.id}</div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        Select a resident before creating a request.
                      </div>
                    )}

                    <div className="mt-3 grid gap-2">
                      {residentPickerResults.map((resident) => (
                        <button
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            documentForm.residentId === resident.id
                              ? "border-gov-700 bg-gov-700 text-white"
                              : "border-orange-100 bg-white text-slate-700 hover:border-gov-300"
                          }`}
                          key={resident.id}
                          onClick={() => selectDocumentFormResident(resident)}
                          type="button"
                        >
                          <span className="block font-semibold">{resident.name}</span>
                          <span className="block text-xs opacity-80">{resident.id}</span>
                        </button>
                      ))}
                      {residentPickerResults.length === 0 ? (
                        <StateMessage tone="neutral">No residents match this search.</StateMessage>
                      ) : null}
                    </div>
                  </div>

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

                  {documentForm.barangayDocumentId === "BDOC-OTHER" ? (
                    <label className="block md:col-span-2 lg:col-span-1">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Requested document title
                      </span>
                      <input
                        className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                        name="customDocumentTitle"
                        onChange={handleDocumentFormChange}
                        required
                        value={documentForm.customDocumentTitle}
                      />
                    </label>
                  ) : null}

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

        {releaseConfirmationRequest ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
              <h3 className="text-lg font-black text-slate-900">Confirm Release</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">Resident:</span>{" "}
                  {getResidentName(releaseConfirmationRequest.residentId, releaseConfirmationRequest)}
                </p>
                <p>
                  <span className="font-semibold">Document:</span>{" "}
                  {releaseConfirmationRequest.documentType}
                </p>
                <p>
                  <span className="font-semibold">Purpose:</span>{" "}
                  {releaseConfirmationRequest.purpose}
                </p>
                <p>
                  The release date will be set to today unless a release date is already provided.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button onClick={() => setReleaseConfirmationId("")} variant="secondary">
                  Cancel
                </Button>
                <Button disabled={isDocumentRequestLoading} onClick={handleConfirmRelease}>
                  Mark Released
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {archiveConfirmationRequest ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <form className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onSubmit={handleConfirmArchive}>
              <h3 className="text-lg font-black text-slate-900">Archive Request</h3>
              <p className="mt-2 text-sm text-slate-600">
                Archived requests are removed from active lists without deleting the record.
              </p>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Archive reason</span>
                <select
                  className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                  onChange={(event) => setArchiveReason(event.target.value)}
                  required
                  value={archiveReason}
                >
                  <option value="">Select reason</option>
                  {archiveReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Archive note</span>
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
                  onChange={(event) => setArchiveNote(event.target.value)}
                  value={archiveNote}
                />
              </label>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button onClick={() => setArchiveConfirmationId("")} variant="secondary">
                  Cancel
                </Button>
                <Button disabled={isDocumentRequestLoading || !archiveReason} type="submit">
                  Archive
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
