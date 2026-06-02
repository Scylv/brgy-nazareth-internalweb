import { useState } from "react";
import Button from "./Button";

export default function AppShell({
  user,
  title,
  subtitle,
  actions,
  children,
  onChangePassword,
  onLogout,
  passwordChangeStatus = { error: "", message: "" }
}) {
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: ""
  });
  const roleContext = {
    admin: "Admin view",
    department: "Department view",
    lupon: "Lupon view"
  };

  function handlePasswordFormChange(event) {
    const { name, value } = event.target;

    setPasswordForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    const changed = await onChangePassword?.(passwordForm);

    if (changed) {
      setPasswordForm({
        currentPassword: "",
        newPassword: ""
      });
      setIsPasswordFormOpen(false);
    }
  }

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
            <Button
              onClick={() => setIsPasswordFormOpen((current) => !current)}
              size="lg"
              variant="quiet"
            >
              Password
            </Button>
            <Button onClick={onLogout} size="lg" variant="quiet">
              Log out
            </Button>
          </div>
        </header>

        {isPasswordFormOpen ? (
          <form
            className="grid gap-3 border-b border-orange-100 bg-orange-50 px-5 py-4 md:grid-cols-[1fr_1fr_auto_auto] lg:px-6"
            onSubmit={handlePasswordSubmit}
          >
            <input
              className="min-w-0 rounded-2xl border border-orange-100 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
              name="currentPassword"
              onChange={handlePasswordFormChange}
              placeholder="Current password"
              required
              type="password"
              value={passwordForm.currentPassword}
            />
            <input
              className="min-w-0 rounded-2xl border border-orange-100 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
              minLength={8}
              name="newPassword"
              onChange={handlePasswordFormChange}
              placeholder="New password"
              required
              type="password"
              value={passwordForm.newPassword}
            />
            <Button type="submit">Save</Button>
            <Button onClick={() => setIsPasswordFormOpen(false)} variant="quiet">
              Cancel
            </Button>
          </form>
        ) : null}

        {passwordChangeStatus.message || passwordChangeStatus.error ? (
          <div
            className={`border-b px-5 py-3 text-sm font-semibold lg:px-6 ${
              passwordChangeStatus.error
                ? "border-rose-100 bg-rose-50 text-rose-700"
                : "border-emerald-100 bg-emerald-50 text-emerald-800"
            }`}
          >
            {passwordChangeStatus.error || passwordChangeStatus.message}
          </div>
        ) : null}

        <main className="p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
