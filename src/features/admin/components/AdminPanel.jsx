export default function AdminPanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[1.75rem] border border-orange-100 bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gov-700">
          Account Oversight
        </p>
        <h2 className="mt-3 text-3xl font-black text-slate-900">User Management</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Local account assignments remain intentionally lightweight while role access
          stays visible for internal review.
        </p>

        <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-orange-100">
          <div className="grid gap-px bg-orange-100">
            <div className="grid grid-cols-3 gap-4 bg-orange-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gov-700">
              <span>Name</span>
              <span>Role</span>
              <span>Status</span>
            </div>
            {[
              ["Ricardo Morales", "Admin", "Active"],
              ["Elena Ledesma", "Department Office", "Active"],
              ["Juan Santos", "Lupon Staff", "Active"]
            ].map(([name, role, status]) => (
              <div className="grid grid-cols-3 gap-4 bg-white px-5 py-4 text-sm" key={name}>
                <span className="font-semibold text-slate-900">{name}</span>
                <span className="text-slate-600">{role}</span>
                <span className="text-emerald-700">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-orange-100 bg-orange-50 p-6">
        <h3 className="text-xl font-black text-slate-900">Current Scope</h3>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          <li>No backend persistence</li>
          <li>No external authentication service</li>
          <li>No file uploads beyond local text entries</li>
          <li>No live notifications or chat features</li>
        </ul>
      </section>
    </div>
  );
}
