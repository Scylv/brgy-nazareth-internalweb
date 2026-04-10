export function validateResidentForm(data) {
  const errors = {};

  if (!data.name?.trim()) {
    errors.name = "Full name is required.";
  }

  if (!data.id?.trim()) {
    errors.id = "Resident ID is required.";
  }

  if (!data.address?.trim()) {
    errors.address = "Address is required.";
  }

  if (!["green", "yellow", "red"].includes(data.status)) {
    errors.status = "Status must be green, yellow, or red.";
  }

  if (!Array.isArray(data.documents)) {
    errors.documents = "Documents must be a list.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
