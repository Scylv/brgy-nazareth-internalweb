export function cloneResident(resident) {
  return {
    ...resident,
    sectors: [...resident.sectors],
    documents: [...resident.documents]
  };
}
