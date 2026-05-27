import { useState } from "react";
import { getAccountGroups, getAdminCounters } from "../lib/accountManagement";

const actionLabels = ["Change role", "Disable account", "Reset password"];

const actionMessages = {
  "Add account": "Account creation will be available after database and authentication integration.",
  "Change role": "Role updates will be available after database and authentication integration.",
  "Disable account": "Account disabling will be available after database and authentication integration.",
  "Reset password": "Password reset will be available after database and authentication integration."
};

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

export default function AdminPanel({ documentRequests, residents, users }) {
  const [actionNotice, setActionNotice] = useState("");
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
              Manage local mock accounts by role while keeping document processing and Lupon case
              details outside the Admin workspace.
            </p>
          </div>
          <button
            className="rounded-2xl bg-gov-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gov-800"
            onClick={() => setActionNotice(actionMessages["Add account"])}
            type="button"
          >
            Add account
          </button>
        </div>

        <div className="mt-5 rounded-[1.25rem] border border-orange-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
          Account changes shown here are prototype-only and are not persisted to authentication,
          password storage, an API, or a database.
        </div>

        {actionNotice ? (
          <div
            className="mt-3 rounded-[1.25rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium leading-6 text-sky-900"
            role="status"
          >
            {actionNotice}
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
                        Active
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {actionLabels.map((action) => (
                      <button
                        className="rounded-xl border border-orange-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-gov-300 hover:bg-orange-50"
                        key={`${account.id}-${action}`}
                        onClick={() => setActionNotice(actionMessages[action])}
                        type="button"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </article>
              ))}

              {group.accounts.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-500">
                  No mock accounts assigned to this role.
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
