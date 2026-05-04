const statusOptions = [
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" }
];

function Section({ title, children }) {
  return (
    <section className="rounded-[1.75rem] border border-orange-100 bg-white p-6">
      <h3 className="text-xl font-black text-slate-900">{title}</h3>
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

export default function ResidentRecordForm({
  formData,
  errors,
  onChange,
  onDocumentInputChange,
  onSave,
  onCancel
}) {
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
          Save resident record
        </button>
      </div>

      <Section title="Personal Information">
        <Field error={errors.name} label="Full Name">
          <input className={inputClassName} name="name" onChange={onChange} value={formData.name} />
        </Field>

        <Field error={errors.id} label="Resident ID">
          <input className={inputClassName} name="id" onChange={onChange} value={formData.id} />
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
        </Field>

        <Field label="Documents (comma-separated)">
          <input
            className={inputClassName}
            onChange={onDocumentInputChange}
            value={formData.documents.join(", ")}
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Lupon Remarks">
            <textarea
              className={`${inputClassName} min-h-28`}
              name="remarks"
              onChange={onChange}
              value={formData.remarks}
            />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label="Confidential Lupon Details">
            <textarea
              className={`${inputClassName} min-h-28`}
              name="caseReason"
              onChange={onChange}
              value={formData.caseReason}
            />
          </Field>
        </div>
      </Section>
    </form>
  );
}
