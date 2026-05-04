import StatusBadge from "../../../shared/components/StatusBadge";

export default function DepartmentDashboard({
  query,
  results,
  onQueryChange,
  onSelectResident
}) {
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
        </div>
      </section>
    </div>
  );
}
