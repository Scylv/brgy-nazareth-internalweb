import { useEffect, useState } from "react";
import Button from "../../../shared/components/Button";
import ResidentDocumentPanel from "../../documents/components/ResidentDocumentPanel";
import StatusBadge from "../../../shared/components/StatusBadge";
import DocumentRequestHistory from "../../../shared/components/DocumentRequestHistory";
import MetricCard from "../../../shared/components/MetricCard";
import Notice from "../../../shared/components/Notice";
import PaginationControls from "../../../shared/components/PaginationControls";
import SectionCard from "../../../shared/components/SectionCard";
import SectionHeader from "../../../shared/components/SectionHeader";
import StateMessage from "../../../shared/components/StateMessage";
import { getDocumentRequestsForResident } from "../../../shared/lib/documentRequests";
import { RESIDENT_STATUS_FILTERS } from "../../../shared/lib/filterResidents";
import { getNextPage, getPaginatedItems, getPreviousPage } from "../../../shared/lib/pagination";
import { getResidentLuponCaseDisplay } from "../lib/luponCaseDisplay";

const statusFilterLabels = {
  all: "All",
  green: "Green",
  yellow: "Yellow",
  red: "Red"
};
const residentListPageSize = 5;
const luponDocumentScopes = ["department_visible", "general_internal", "lupon_confidential"];
const luponDocumentViews = [
  {
    key: "general",
    label: "General / Vital",
    scopes: ["department_visible", "general_internal"],
    defaultVisibilityScope: "general_internal"
  },
  {
    key: "confidential",
    label: "Lupon Confidential",
    scopes: ["lupon_confidential"],
    defaultVisibilityScope: "lupon_confidential"
  }
];

export default function LuponDashboard({
  documentRequests,
  isLuponCaseLoading = false,
  luponCaseError = "",
  luponCases = [],
  query,
  residents,
  selectedResident,
  selectedResidentId,
  onQueryChange,
  onSelectResident,
  onOpenForm,
  onStatusFilterChange,
  statusFilter
}) {
  const [residentPage, setResidentPage] = useState(1);
  const selectedResidentDocumentRequests = selectedResident
    ? getDocumentRequestsForResident(selectedResident.id, documentRequests)
    : [];
  const paginatedResidents = getPaginatedItems(residents, {
    page: residentPage,
    pageSize: residentListPageSize
  });

  useEffect(() => {
    setResidentPage(1);
  }, [query, statusFilter]);

  useEffect(() => {
    if (residentPage !== paginatedResidents.page) {
      setResidentPage(paginatedResidents.page);
    }
  }, [paginatedResidents.page, residentPage]);

  return (
    <div className="space-y-6">
      <SectionCard variant="hero">
        <SectionHeader
          description="Search resident records and narrow the registry by current clearance status."
          title="Lupon Resident Registry"
        />
        <Notice className="mt-4 inline-flex max-w-full">
          Lupon view: review case summaries and maintain resident status colors.
        </Notice>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            className="flex-1 rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none transition focus:border-gov-500"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search resident by name or RBI ID"
            value={query}
          />
          <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
            {residents.length} resident{residents.length === 1 ? "" : "s"} shown
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

        {isLuponCaseLoading ? (
          <StateMessage className="mt-4" tone="info">
            Loading Lupon cases from the database API...
          </StateMessage>
        ) : null}

        {luponCaseError ? (
          <StateMessage className="mt-4" tone="danger">
            {luponCaseError}
          </StateMessage>
        ) : null}
      </SectionCard>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          description="Resident records loaded from the database API"
          label="Registry"
          tone="orange"
          value={residents.length}
        />
        <MetricCard
          description="Pending Lupon assessment"
          label="For Review"
          tone="amber"
          value={residents.filter((resident) => resident.status === "yellow").length}
        />
        <MetricCard
          description="Hold clearance until resolved"
          label="Active Referral"
          tone="rose"
          value={residents.filter((resident) => resident.status === "red").length}
        />
      </section>

      <SectionCard className="overflow-hidden" padding="none">
        <div className="grid gap-px bg-orange-100">
          <div className="grid grid-cols-[1.3fr_0.8fr_1fr_auto] gap-4 bg-orange-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gov-700">
            <span>Resident</span>
            <span>Status</span>
            <span>Lupon Case Summary</span>
            <span>Edit</span>
          </div>

          {paginatedResidents.items.map((resident) => {
            const caseDisplay = getResidentLuponCaseDisplay(resident, luponCases);

            return (
              <div
                className={`grid grid-cols-1 gap-4 bg-white px-5 py-4 lg:grid-cols-[1.3fr_0.8fr_1fr_auto] ${
                  resident.id === selectedResidentId ? "border-l-4 border-gov-600 bg-orange-50/60" : ""
                }`}
                key={resident.id}
              >
                <button
                  className="text-left"
                  onClick={() => onSelectResident(resident.id)}
                  type="button"
                >
                  <div className="font-semibold text-slate-900">{resident.name}</div>
                  <div className="text-sm text-slate-600">{resident.id}</div>
                  <div className="text-sm text-slate-500">{caseDisplay.caseLine}</div>
                </button>

                <div className="flex flex-col justify-center gap-2">
                  <StatusBadge status={resident.status} />
                  {caseDisplay.statusLabel ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {caseDisplay.statusLabel}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center text-sm text-slate-600">{caseDisplay.summary}</div>

                <div className="flex items-center">
                  <Button onClick={() => onOpenForm(resident.id)}>
                    Edit record
                  </Button>
                </div>
              </div>
            );
          })}

          {residents.length === 0 ? (
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
                totalPages: paginatedResidents.totalPages
              })
            )
          }
          onPrevious={() => setResidentPage((page) => getPreviousPage({ page }))}
          page={paginatedResidents.page}
          totalPages={paginatedResidents.totalPages}
        />
      </SectionCard>

      {selectedResident ? (
        <section className="space-y-6">
          <DocumentRequestHistory
            requests={selectedResidentDocumentRequests}
            title={`${selectedResident.name} Document History`}
          />

          <ResidentDocumentPanel
            allowedScopes={luponDocumentScopes}
            defaultVisibilityScope="general_internal"
            description="Shared resident files and Lupon-only case documents for this resident."
            documentViews={luponDocumentViews}
            residentId={selectedResident.id}
            residentName={selectedResident.name}
            title="Documents"
          />
        </section>
      ) : null}
    </div>
  );
}
