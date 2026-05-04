import StatusBadge from "../../../shared/components/StatusBadge";
import { RESIDENT_STATUS_FILTERS } from "../../../shared/lib/filterResidents";

const statusFilterLabels = {
  all: "All",
  green: "Green",
  yellow: "Yellow",
  red: "Red"
};

export default function LuponDashboard({
  query,
  residents,
  selectedResidentId,
  onQueryChange,
  onAddResident,
  onSelectResident,
  onOpenForm,
  onStatusFilterChange,
  statusFilter
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-6">
        <h2 className="text-2xl font-black text-slate-900">Lupon Resident Registry</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Search resident records and narrow the registry by current clearance status.
        </p>

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
          <button
            className="rounded-2xl bg-gov-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gov-800"
            onClick={onAddResident}
            type="button"
          >
            Add resident
          </button>
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

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-orange-100 bg-orange-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gov-700">Registry</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{residents.length}</p>
          <p className="mt-2 text-sm text-slate-600">Resident records loaded from local data</p>
        </div>
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">For Review</p>
          <p className="mt-3 text-3xl font-black text-amber-900">
            {residents.filter((resident) => resident.status === "yellow").length}
          </p>
          <p className="mt-2 text-sm text-amber-800">Pending Lupon assessment</p>
        </div>
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">Active Referral</p>
          <p className="mt-3 text-3xl font-black text-rose-900">
            {residents.filter((resident) => resident.status === "red").length}
          </p>
          <p className="mt-2 text-sm text-rose-800">Hold clearance until resolved</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border border-orange-100">
        <div className="grid gap-px bg-orange-100">
          <div className="grid grid-cols-[1.3fr_0.8fr_1fr_auto] gap-4 bg-orange-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gov-700">
            <span>Resident</span>
            <span>Status</span>
            <span>Internal Remarks</span>
            <span>Edit</span>
          </div>

          {residents.map((resident) => (
            <div
              className={`grid grid-cols-1 gap-4 bg-white px-5 py-4 lg:grid-cols-[1.3fr_0.8fr_1fr_auto] ${
                resident.id === selectedResidentId ? "ring-2 ring-gov-500 ring-inset" : ""
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
                <div className="text-sm text-slate-500">{resident.caseReason || "No active case reason"}</div>
              </button>

              <div className="flex items-center">
                <StatusBadge status={resident.status} />
              </div>

              <div className="flex items-center text-sm text-slate-600">{resident.remarks}</div>

              <div className="flex items-center">
                <button
                  className="rounded-2xl bg-gov-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gov-800"
                  onClick={() => onOpenForm(resident.id)}
                  type="button"
                >
                  Edit record
                </button>
              </div>
            </div>
          ))}

          {residents.length === 0 ? (
            <div className="bg-white px-5 py-8 text-center text-sm text-slate-500">
              No residents match the current search and status filter.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
