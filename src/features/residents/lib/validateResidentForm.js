export function validateResidentForm(data) {
  const errors = {};

  if (!data.name?.trim()) {
    errors.name = "Full name is required.";
  }

  if (!data.id?.trim()) {
    errors.id = "Resident ID is required.";
  }

  if (!data.householdId?.trim()) {
    errors.householdId = "Household ID is required.";
  }

  if (!data.address?.trim()) {
    errors.address = "Address is required.";
  }

  if (!data.gender?.trim()) {
    errors.gender = "Gender is required.";
  }
  if (!data.birthDate?.trim()) {
    errors.birthDate = "Birth date is required.";
  }
  if (!/^09\d{9}$/.test(data.contactNumber || "")) {
    errors.contactNumber =
    "Contact number must start with 09 and be exactly 11 digits.";
  }
  if (!data.email?.trim() || !data.email.endsWith("@gmail.com")) {
    errors.email = "Email must be a valid Gmail address.";
  }

  if (!["green", "yellow", "red"].includes(data.status)) {
    errors.status = "Status must be green, yellow, or red.";
  }

  if (!Array.isArray(data.sectors)) {
    errors.sectors = "Sectors must be a list.";
  }

  if (!Array.isArray(data.documents)) {
    errors.documents = "Documents must be a list.";
  }

  if (data.registeredVoter && !data.precinctNumber?.trim()) {
    errors.precinctNumber = "Precinct number is required for registered voters.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
