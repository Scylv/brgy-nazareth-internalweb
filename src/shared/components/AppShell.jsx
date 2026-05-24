import Button from "./Button";

export default function AppShell({ user, title, subtitle, actions, children, onLogout }) {
  const roleContext = {
    admin: "Admin view",
    department: "Department view",
    lupon: "Lupon view"
  };

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-orange-100 bg-white shadow-panel">
        <header className="flex flex-col gap-5 border-b border-orange-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gov-700">
              Barangay Nazareth Internal
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {actions}
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2.5 text-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gov-700">
                {roleContext[user.role] ?? "Staff view"}
              </div>
              <div className="font-semibold text-slate-900">{user.name}</div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{user.role}</div>
            </div>
            <Button onClick={onLogout} size="lg" variant="quiet">
              Log out
            </Button>
          </div>
        </header>

        <main className="p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
