function getNextCode(existingCodes, fallbackPrefix) {
  const maxCode = existingCodes.reduce((max, code) => {
    const match = code.match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `${fallbackPrefix}-${String(maxCode + 1).padStart(4, "0")}`;
}

export function createBlankResident(existingResidents = []) {
  return {
    id: getNextCode(
      existingResidents.map((resident) => resident.id),
      "RBI-2024"
    ),
    householdId: getNextCode(
      existingResidents.map((resident) => resident.householdId),
      "HH-NAZ"
    ),
    name: "",
    birthDate: "",
    gender: "",
    civilStatus: "",
    occupation: "",
    address: "",
    contactNumber: "",
    email: "",
    additionalInformation: "",
    sectors: [],
    registeredVoter: false,
    precinctNumber: "",
    status: "green",
    remarks: "",
    caseReason: "",
    documents: []
  };
}
