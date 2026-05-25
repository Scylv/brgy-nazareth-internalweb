import { useState } from "react";
import Button from "../../../shared/components/Button";
import MetricCard from "../../../shared/components/MetricCard";
import SectionCard from "../../../shared/components/SectionCard";
import SectionHeader from "../../../shared/components/SectionHeader";
import StateMessage from "../../../shared/components/StateMessage";
import { getAccountGroups, getAdminCounters } from "../lib/accountManagement";

const counterCards = [
  {
    key: "totalResidents",
    label: "Residents",
    tone: "orange"
  },
  {
    key: "totalDepartmentAccounts",
    label: "Department Accounts",
    tone: "sky"
  },
  {
    key: "totalLuponAccounts",
    label: "Lupon Accounts",
    tone: "emerald"
  },
  {
    key: "totalDocumentRequests",
    label: "Document Requests",
    tone: "amber"
  }
];

export default function AdminPanel({
  actionError = "",
  actionMessage = "",
  documentRequests,
  error = "",
  isLoading = false,
  isMutating = false,
  onCreateAccount,
  onResetPassword,
  onToggleAccountStatus,
  residents,
  users
}) {
  const [accountForm, setAccountForm] = useState({
    username: "",
    displayName: "",
    role: "department",
    temporaryPassword: ""
  });
  const [resetForm, setResetForm] = useState({
    profileId: "",
    temporaryPassword: ""
  });
  const accountGroups = getAccountGroups(users);
  const counters = getAdminCounters({ users, residents, documentRequests });

  function handleAccountFormChange(event) {
    const { name, value } = event.target;

    setAccountForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleCreateAccount(event) {
    event.preventDefault();

    const created = await onCreateAccount?.(accountForm);

    if (created) {
      setAccountForm({
        username: "",
        displayName: "",
        role: "department",
        temporaryPassword: ""
      });
    }
  }

  function openResetForm(profileId) {
    setResetForm({
      profileId,
      temporaryPassword: ""
    });
  }

  async function handleResetPassword(event) {
    event.preventDefault();

    const reset = await onResetPassword?.(resetForm.profileId, resetForm.temporaryPassword);

    if (reset) {
      setResetForm({
        profileId: "",
        temporaryPassword: ""
      });
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard variant="hero">
        <SectionHeader
          description="View database-backed staff profiles by role while keeping document processing and Lupon case details outside the Admin workspace."
          eyebrow="Account Management"
          title="System Access"
        />

        {isLoading ? (
          <StateMessage className="mt-3" tone="info">
            Loading database profiles...
          </StateMessage>
        ) : null}

        {error ? (
          <StateMessage className="mt-3" tone="danger">
            {error}
          </StateMessage>
        ) : null}

        {actionMessage ? (
          <StateMessage className="mt-3" tone="success">
            {actionMessage}
          </StateMessage>
        ) : null}

        {actionError ? (
          <StateMessage className="mt-3" tone="danger">
            {actionError}
          </StateMessage>
        ) : null}
      </SectionCard>

      <section className="grid gap-4 md:grid-cols-4">
        {counterCards.map((card) => (
          <MetricCard
            key={card.key}
            label={card.label}
            tone={card.tone}
            value={counters[card.key]}
          />
        ))}
      </section>

      <SectionCard>
        <SectionHeader eyebrow="Provision Account" title="Create Staff Access" />

        <form className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_12rem_1fr_auto]" onSubmit={handleCreateAccount}>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Display name
            <input
              className="w-full rounded-2xl border border-orange-100 px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
              name="displayName"
              onChange={handleAccountFormChange}
              required
              value={accountForm.displayName}
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Username
            <input
              className="w-full rounded-2xl border border-orange-100 px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
              name="username"
              onChange={handleAccountFormChange}
              required
              value={accountForm.username}
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Role
            <select
              className="w-full rounded-2xl border border-orange-100 px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
              name="role"
              onChange={handleAccountFormChange}
              value={accountForm.role}
            >
              <option value="department">Department</option>
              <option value="lupon">Lupon</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Temporary password
            <input
              className="w-full rounded-2xl border border-orange-100 px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
              minLength={8}
              name="temporaryPassword"
              onChange={handleAccountFormChange}
              required
              type="password"
              value={accountForm.temporaryPassword}
            />
          </label>

          <div className="flex items-end">
            <Button className="w-full lg:w-auto" disabled={isMutating} size="lg" type="submit">
              Create
            </Button>
          </div>
        </form>
      </SectionCard>

      <section className="grid gap-5 xl:grid-cols-3">
        {accountGroups.map((group) => (
          <SectionCard className="overflow-hidden" key={group.role} padding="none">
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
                      <p
                        className={`mt-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                          account.status === "disabled" ? "text-rose-700" : "text-emerald-700"
                        }`}
                      >
                        {account.status === "disabled" ? "Disabled" : "Active"}
                      </p>
                      {account.createdAt ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Created {String(account.createdAt).slice(0, 10)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={isMutating}
                      onClick={() =>
                        onToggleAccountStatus?.(
                          account.id,
                          account.status === "disabled" ? "active" : "disabled"
                        )
                      }
                      size="sm"
                      variant={account.status === "disabled" ? "secondary" : "quiet"}
                    >
                      {account.status === "disabled" ? "Reactivate" : "Deactivate"}
                    </Button>
                    <Button
                      disabled={isMutating}
                      onClick={() => openResetForm(account.id)}
                      size="sm"
                      variant="quiet"
                    >
                      Reset password
                    </Button>
                  </div>

                  {resetForm.profileId === account.id ? (
                    <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleResetPassword}>
                      <input
                        className="min-w-0 flex-1 rounded-2xl border border-orange-100 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
                        minLength={8}
                        onChange={(event) =>
                          setResetForm((current) => ({
                            ...current,
                            temporaryPassword: event.target.value
                          }))
                        }
                        required
                        type="password"
                        value={resetForm.temporaryPassword}
                      />
                      <Button disabled={isMutating} size="sm" type="submit">
                        Save
                      </Button>
                      <Button
                        disabled={isMutating}
                        onClick={() => setResetForm({ profileId: "", temporaryPassword: "" })}
                        size="sm"
                        variant="quiet"
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : null}
                </article>
              ))}

              {group.accounts.length === 0 ? (
                <StateMessage className="rounded-none border-0 bg-white px-5 py-8 text-center" tone="neutral">
                  No database profiles assigned to this role.
                </StateMessage>
              ) : null}
            </div>
          </SectionCard>
        ))}
      </section>
    </div>
  );
}
