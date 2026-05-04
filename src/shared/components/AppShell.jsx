export default function AppShell({ user, title, subtitle, actions, children, onLogout }) {
  return (
    <div className="min-h-screen px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-orange-100 bg-white shadow-panel">
        <header className="flex flex-col gap-6 border-b border-orange-100 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gov-700">
              Barangay Nazareth Internal
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {actions}
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm">
              <div className="font-semibold text-slate-900">{user.name}</div>
              <div className="uppercase tracking-[0.2em] text-gov-700">{user.role}</div>
            </div>
            <button
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-gov-300 hover:text-gov-800"
              onClick={onLogout}
              type="button"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
