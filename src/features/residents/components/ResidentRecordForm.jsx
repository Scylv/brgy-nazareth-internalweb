import { useState } from "react";
import Button from "../../../shared/components/Button";
import SectionCard from "../../../shared/components/SectionCard";
import StateMessage from "../../../shared/components/StateMessage";
import ResidentDocumentPanel from "../../documents/components/ResidentDocumentPanel";

const statusOptions = [
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" }
];

function Section({ title, children }) {
  return (
    <SectionCard>
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </SectionCard>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="mt-2 block text-sm text-rose-600">{error}</span> : null}
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 outline-none transition focus:border-gov-500 focus:bg-white";
const readOnlyInputClassName =
  "w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-600 outline-none";
const luponDocumentScopes = ["department_visible", "general_internal", "lupon_confidential"];
const luponDocumentViews = [
  {
    key: "general",
    label: "General / Vital",
    scopes: ["department_visible", "general_internal"],
    defaultVisibilityScope: "general_internal"
  },
  {
    key: "confidential",
    label: "Lupon Confidential",
    scopes: ["lupon_confidential"],
    defaultVisibilityScope: "lupon_confidential"
  }
];
const luponCaseStatusLabels = {
  open: "Open",
  under_mediation: "Under Mediation",
  resolved: "Resolved",
  dismissed: "Dismissed",
  referred: "Referred"
};
const activeLuponCaseStatuses = new Set(["open", "under_mediation"]);

function getLuponCaseStatusLabel(status) {
  return luponCaseStatusLabels[status] ?? "Open";
}

function canResolveLuponCase(luponCase, isCreating) {
  return Boolean(
    luponCase?.id &&
      !isCreating &&
      activeLuponCaseStatuses.has(luponCase.status ?? "open")
  );
}

export default function ResidentRecordForm({
  formData,
  errors,
  luponCase = null,
  luponCaseDraft = {
    caseTitle: "",
    confidentialSummary: "",
    isCreating: false
  },
  mode = "edit",
  onChange,
  onLuponCaseDraftChange,
  onResolveLuponCase,
  isResolveConfirmationOpen,
  onStartLuponCaseCreate,
  onSave,
  onCancel
}) {
  const [localResolveConfirmationOpen, setLocalResolveConfirmationOpen] = useState(false);
  const isEditMode = mode === "edit";
  const showLuponCaseFields = Boolean(luponCase || luponCaseDraft.isCreating);
  const showResolveConfirmation =
    isResolveConfirmationOpen ?? localResolveConfirmationOpen;
  const showResolveAction = canResolveLuponCase(luponCase, luponCaseDraft.isCreating);

  if (mode === "add") {
    return (
      <SectionCard>
        <StateMessage tone="info">
          New resident records are managed through Admin import/registry tools.
        </StateMessage>
        <div className="mt-4">
          <Button onClick={onCancel} size="lg" type="button" variant="quiet">
            Back to Lupon dashboard
          </Button>
        </div>
      </SectionCard>
    );
  }

  function handleLuponCaseDraftChange(field, value) {
    onLuponCaseDraftChange?.({
      ...luponCaseDraft,
      [field]: value,
      isCreating: luponCaseDraft.isCreating || !luponCase
    });
  }

  function setResolveConfirmationOpen(isOpen) {
    setLocalResolveConfirmationOpen(isOpen);
  }

  async function handleConfirmResolveCase() {
    const didResolve = await onResolveLuponCase?.(luponCase);

    if (didResolve !== false) {
      setResolveConfirmationOpen(false);
    }
  }

  return (
    <>
    <form className="space-y-6" onSubmit={onSave}>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onCancel} size="lg" variant="quiet">
          Back to Lupon dashboard
        </Button>
        <Button size="lg" type="submit">
          Save resident record
        </Button>
      </div>

      {errors.form ? (
        <StateMessage tone="danger">
          {errors.form}
        </StateMessage>
      ) : null}

      <Section title="Personal Information">
        <Field error={errors.name} label="Full Name">
          <input className={inputClassName} name="name" onChange={onChange} value={formData.name} />
        </Field>

        <Field error={errors.id} label="Resident ID">
          <input
            aria-readonly={isEditMode}
            className={isEditMode ? readOnlyInputClassName : inputClassName}
            name="id"
            onChange={isEditMode ? undefined : onChange}
            readOnly={isEditMode}
            value={formData.id}
          />
          {isEditMode ? (
            <span className="mt-2 block text-xs text-slate-500">
              Resident ID is locked to preserve record consistency.
            </span>
          ) : null}
        </Field>

        <Field error={errors.householdId} label="Household ID">
          <input
            className={inputClassName}
            name="householdId"
            onChange={onChange}
            value={formData.householdId}
          />
        </Field>

        <Field label="Birth Date">
          <input
            className={inputClassName}
            name="birthDate"
            onChange={onChange}
            type="date"
            value={formData.birthDate}
          />
        </Field>

        <Field label="Civil Status">
          <input
            className={inputClassName}
            name="civilStatus"
            onChange={onChange}
            value={formData.civilStatus}
          />
        </Field>

        <Field error={errors.gender} label="Gender">
          <select className={inputClassName} name="gender" onChange={onChange} value={formData.gender}>
            <option value="">Select gender</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </Field>
      </Section>

      <Section title="Address & Contact">
        <Field error={errors.address} label="Address">
          <input className={inputClassName} name="address" onChange={onChange} value={formData.address} />
        </Field>

        <Field label="Contact Number">
          <input
            className={inputClassName}
            name="contactNumber"
            onChange={onChange}
            value={formData.contactNumber}
          />
        </Field>

        <Field label="Email">
          <input className={inputClassName} name="email" onChange={onChange} value={formData.email} />
        </Field>

        <Field label="Occupation">
          <input
            className={inputClassName}
            name="occupation"
            onChange={onChange}
            value={formData.occupation}
          />
        </Field>
      </Section>

      <Section title="Additional Information">
        <div className="md:col-span-2">
          <Field label="Notes">
            <textarea
              className={`${inputClassName} min-h-28`}
              name="additionalInformation"
              onChange={onChange}
              value={formData.additionalInformation}
            />
          </Field>
        </div>
      </Section>

      <Section title="Sector Classification">
        <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
          {errors.sectors ? (
            <p className="sm:col-span-2 text-sm text-rose-600">{errors.sectors}</p>
          ) : null}
          {["Senior Citizen", "PWD", "Solo Parent", "Registered Voter", "4Ps Member"].map(
            (sector) => (
              <label
                className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3"
                key={sector}
              >
                <input
                  checked={
                    sector === "Registered Voter"
                      ? formData.registeredVoter
                      : formData.sectors.includes(sector)
                  }
                  name={sector === "Registered Voter" ? "registeredVoter" : "sectors"}
                  onChange={onChange}
                  type="checkbox"
                  value={sector}
                />
                <span className="text-sm text-slate-700">{sector}</span>
              </label>
            )
          )}
        </div>

        {formData.registeredVoter ? (
          <Field error={errors.precinctNumber} label="Precinct Number">
            <input
              className={inputClassName}
              name="precinctNumber"
              onChange={onChange}
              value={formData.precinctNumber}
            />
          </Field>
        ) : null}
      </Section>

      <Section title="Record Status">
        <Field error={errors.status} label="Status">
          <select className={inputClassName} name="status" onChange={onChange} value={formData.status}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="mt-2 block text-xs leading-5 text-slate-500">
            Green: Cleared - proceed. Yellow: Needs Lupon review. Red: Hold - Lupon required.
          </span>
        </Field>

        <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">Lupon case details</p>
          {!showLuponCaseFields ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-amber-800">No active Lupon case</p>
              <Button
                onClick={() =>
                  onStartLuponCaseCreate?.() ??
                  onLuponCaseDraftChange?.({
                    caseTitle: "",
                    confidentialSummary: "",
                    isCreating: true
                  })
                }
                size="sm"
                type="button"
                variant="secondary"
              >
                Create Lupon Case
              </Button>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">
                {luponCase?.caseNumber || "New Lupon Case"}
              </p>
              {luponCase ? (
                <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">
                      Case status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {getLuponCaseStatusLabel(luponCase.status)}
                    </p>
                  </div>
                  {showResolveAction ? (
                    <Button
                      onClick={() => setResolveConfirmationOpen(true)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Resolve case
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <label className="mt-3 block">
                <span className="mb-2 block text-sm font-medium text-amber-900">Case title</span>
                <input
                  className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-gov-500"
                  name="luponCaseTitle"
                  onChange={(event) => handleLuponCaseDraftChange("caseTitle", event.target.value)}
                  value={luponCaseDraft.caseTitle}
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-2 block text-sm font-medium text-amber-900">
                  Confidential case summary
                </span>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-gov-500"
                  name="luponCaseSummary"
                  onChange={(event) =>
                    handleLuponCaseDraftChange("confidentialSummary", event.target.value)
                  }
                  placeholder="No confidential case summary"
                  value={luponCaseDraft.confidentialSummary}
                />
              </label>
            </div>
          )}
        </div>
      </Section>
    </form>
    <div className="mt-6">
      <ResidentDocumentPanel
        allowedScopes={luponDocumentScopes}
        defaultVisibilityScope="general_internal"
        description="Shared resident files and Lupon-only case documents for this resident."
        documentViews={luponDocumentViews}
        residentId={formData.id}
        residentName={formData.name ?? formData.fullName}
        title="Documents"
      />
    </div>
    {showResolveConfirmation && luponCase ? (
      <div
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
        role="dialog"
      >
        <div className="w-full max-w-lg rounded-2xl border border-orange-100 bg-white p-5 shadow-xl">
          <h3 className="text-lg font-black text-slate-900">Resolve Lupon case?</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">Resident:</span>{" "}
              {formData.name ?? formData.fullName}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Case title:</span>{" "}
              {luponCase.caseTitle || luponCase.caseType || "Lupon Case"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Case number:</span>{" "}
              {luponCase.caseNumber || luponCase.id}
            </p>
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              This will close the active Lupon case but preserve its history.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button
              onClick={() => setResolveConfirmationOpen(false)}
              type="button"
              variant="quiet"
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmResolveCase} type="button" variant="secondary">
              Confirm resolve
            </Button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
