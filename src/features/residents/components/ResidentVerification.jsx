import Button from "../../../shared/components/Button";
import ResidentDocumentPanel from "../../documents/components/ResidentDocumentPanel";
import StatusBadge from "../../../shared/components/StatusBadge";
import DocumentRequestHistory from "../../../shared/components/DocumentRequestHistory";
import Notice from "../../../shared/components/Notice";
import SectionCard from "../../../shared/components/SectionCard";
import SectionHeader from "../../../shared/components/SectionHeader";
import { getDocumentRequestsForResident } from "../../../shared/lib/documentRequests";
import { getStatusAction } from "../../../shared/lib/status";

function formatBirthDate(date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));
}

export default function ResidentVerification({ documentRequests, resident, onBack }) {
  const residentDocumentRequests = getDocumentRequestsForResident(resident.id, documentRequests);

  return (
    <div className="space-y-6">
      <Button onClick={onBack} variant="secondary">
        Back to dashboard
      </Button>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard variant="tinted">
          <SectionHeader eyebrow="Limited Resident Information" title={resident.name} />
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
        </SectionCard>

        <section className="space-y-6">
          <SectionCard>
            <SectionHeader eyebrow="Verification Result" title="Clearance Status" />
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
                Use this status color for clearance handling only. Yellow or red means
                the resident should be referred to Lupon without viewing confidential reasons.
              </p>
            </div>
          </SectionCard>

          <Notice tone="neutral">
            <span className="font-semibold text-slate-900">Privacy Notice: </span>
            Case reasons, remarks, notes, evidence, and confidential Lupon details are hidden
            from Department accounts.
          </Notice>
        </section>
      </div>

      <DocumentRequestHistory requests={residentDocumentRequests} />

      <ResidentDocumentPanel
        allowedScopes={["department_visible", "general_internal"]}
        defaultVisibilityScope="department_visible"
        description="PDF and image files used for resident verification."
        residentId={resident.id}
        residentName={resident.name}
        title="General / Vital Documents"
      />
    </div>
  );
}
