import Button from "../../../shared/components/Button";
import MetricCard from "../../../shared/components/MetricCard";
import Notice from "../../../shared/components/Notice";
import SectionCard from "../../../shared/components/SectionCard";
import SectionHeader from "../../../shared/components/SectionHeader";
import StateMessage from "../../../shared/components/StateMessage";
import { getAccountGroups, getAdminCounters } from "../lib/accountManagement";

const actionLabels = ["Change role", "Disable account", "Reset password"];

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
      <SectionCard variant="hero">
        <SectionHeader
          actions={
            <Button disabled size="lg" variant="planned">
              Add account
              <span className="rounded-full bg-white px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                Planned
              </span>
            </Button>
          }
          description="View database-backed staff profiles by role while keeping document processing and Lupon case details outside the Admin workspace."
          eyebrow="Account Management"
          title="System Access"
        />

        <Notice className="mt-4">
          Profile listing is loaded from the database API. Account creation, role updates,
          deactivation, and password reset are visible as planned controls only.
        </Notice>

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
                      <Button disabled key={`${account.id}-${action}`} size="sm" variant="planned">
                        {action}
                        <span className="rounded-full bg-white px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Planned
                        </span>
                      </Button>
                    ))}
                  </div>
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
