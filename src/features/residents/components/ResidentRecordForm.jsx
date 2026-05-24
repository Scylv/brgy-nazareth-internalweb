const statusOptions = [
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" }
];

function Section({ title, children }) {
  return (
    <section className="rounded-[1.5rem] border border-orange-100 bg-white p-5">
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
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

export default function ResidentRecordForm({
  formData,
  errors,
  mode = "edit",
  onChange,
  onSave,
  onCancel
}) {
  const isEditMode = mode === "edit";

  return (
    <form className="space-y-6" onSubmit={onSave}>
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300"
          onClick={onCancel}
          type="button"
        >
          Back to Lupon dashboard
        </button>
        <button
          className="rounded-2xl bg-gov-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gov-800"
          type="submit"
        >
          {mode === "add" ? "Add resident record" : "Save resident record"}
        </button>
      </div>

      {errors.form ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errors.form}
        </div>
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
              Resident ID is locked for existing staging records.
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

        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Documents</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {formData.documents.length > 0
              ? formData.documents.join(", ")
              : "No resident documents are attached to this profile."}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Document handling is managed through document request tracking or future file upload
            work.
          </p>
          {errors.documents ? <span className="mt-2 block text-sm text-rose-600">{errors.documents}</span> : null}
        </div>

        <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">Lupon case details</p>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            Confidential Lupon summaries and notes are managed through Lupon cases, not resident
            profile fields.
          </p>
        </div>
      </Section>
    </form>
  );
}
