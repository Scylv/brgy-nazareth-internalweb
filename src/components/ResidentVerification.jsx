import StatusBadge from "./StatusBadge";
import { getStatusAction } from "../lib/status";

function formatBirthDate(date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));
}

export default function ResidentVerification({ resident, onBack }) {
  return (
    <div className="space-y-6">
      <button
        className="rounded-2xl border border-orange-200 px-4 py-2 text-sm font-medium text-gov-800 transition hover:bg-orange-50"
        onClick={onBack}
        type="button"
      >
        Back to dashboard
      </button>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[1.75rem] border border-orange-100 bg-orange-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gov-700">
            Limited Resident Information
          </p>
          <h2 className="mt-3 text-3xl font-black text-slate-900">{resident.name}</h2>
          <div className="mt-6 space-y-3 text-sm text-slate-700">
            <div className="flex justify-between gap-4 border-b border-orange-100 pb-3">
              <span className="font-medium text-slate-500">RBI ID</span>
              <span>{resident.id}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-orange-100 pb-3">
              <span className="font-medium text-slate-500">Household ID</span>
              <span>{resident.householdId}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-orange-100 pb-3">
              <span className="font-medium text-slate-500">Address</span>
              <span className="text-right">{resident.address}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-orange-100 pb-3">
              <span className="font-medium text-slate-500">Birth Date</span>
              <span>{formatBirthDate(resident.birthDate)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-medium text-slate-500">Civil Status</span>
              <span>{resident.civilStatus}</span>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[1.75rem] border border-orange-100 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gov-700">
              Verification Result
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <StatusBadge status={resident.status} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Department view only
              </span>
            </div>
            <div className="mt-6 rounded-[1.5rem] border border-orange-100 bg-orange-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gov-700">
                Clearance Decision
              </p>
              <h3 className="mt-3 text-3xl font-black text-slate-900">
                {getStatusAction(resident.status)}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Department Office must not view confidential Lupon reasons or internal
                remarks. If the status is yellow or red, verbally refer the resident to
                the Lupon office.
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Privacy Notice
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Case reasons, internal remarks, and confidential Lupon details are hidden
              from Department Office accounts.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
