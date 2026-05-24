import { getAccountGroups, getAdminCounters } from "../lib/accountManagement";

const actionLabels = ["Change role", "Disable account", "Reset password"];

const counterCards = [
  {
    key: "totalResidents",
    label: "Residents",
    tone: "border-orange-100 bg-orange-50 text-gov-700"
  },
  {
    key: "totalDepartmentAccounts",
    label: "Department Accounts",
    tone: "border-sky-100 bg-sky-50 text-sky-700"
  },
  {
    key: "totalLuponAccounts",
    label: "Lupon Accounts",
    tone: "border-emerald-100 bg-emerald-50 text-emerald-700"
  },
  {
    key: "totalDocumentRequests",
    label: "Document Requests",
    tone: "border-amber-100 bg-amber-50 text-amber-700"
  }
];

export default function AdminPanel({
  documentRequests,
  error = "",
  isLoading = false,
  residents,
  users
}) {
  const accountGroups = getAccountGroups(users);
  const counters = getAdminCounters({ users, residents, documentRequests });

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gov-700">
              Account Management
            </p>
            <h2 className="mt-3 text-3xl font-black text-slate-900">System Access</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              View database-backed staff profiles by role while keeping document processing and
              Lupon case details outside the Admin workspace.
            </p>
          </div>
          <button
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
            disabled
            type="button"
          >
            Add account
            <span className="rounded-full bg-white px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
              Planned
            </span>
          </button>
        </div>

        <div className="mt-5 rounded-[1.25rem] border border-orange-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
          Profile listing is loaded from the database API. Account creation, role updates,
          deactivation, and password reset are visible as planned controls only.
        </div>

        {isLoading ? (
          <div
            className="mt-3 rounded-[1.25rem] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium leading-6 text-gov-700"
            role="status"
          >
            Loading database profiles...
          </div>
        ) : null}

        {error ? (
          <div
            className="mt-3 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : null}

      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {counterCards.map((card) => (
          <div className={`rounded-[1.25rem] border p-4 ${card.tone}`} key={card.key}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{counters[card.key]}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {accountGroups.map((group) => (
          <div className="overflow-hidden rounded-[1.5rem] border border-orange-100 bg-white" key={group.role}>
            <div className="flex items-center justify-between gap-4 bg-orange-50 px-5 py-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">{group.label}</h3>
                <p className="text-sm text-slate-600">
                  {group.count} account{group.count === 1 ? "" : "s"}
                </p>
              </div>
              <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gov-700">
                {group.label}
              </span>
            </div>

            <div className="divide-y divide-orange-100">
              {group.accounts.map((account) => (
                <article className="p-5" key={account.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{account.name}</p>
                      <p className="mt-1 text-sm text-slate-600">@{account.username}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        Database profile
                      </p>
                      {account.createdAt ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Created {String(account.createdAt).slice(0, 10)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {actionLabels.map((action) => (
                      <button
                        className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500"
                        disabled
                        key={`${account.id}-${action}`}
                        type="button"
                      >
                        {action}
                        <span className="rounded-full bg-white px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Planned
                        </span>
                      </button>
                    ))}
                  </div>
                </article>
              ))}

              {group.accounts.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-500">
                  No database profiles assigned to this role.
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
