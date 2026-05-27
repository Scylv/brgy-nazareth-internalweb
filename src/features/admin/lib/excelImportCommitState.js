export async function commitExcelImportAndRefreshResidents({
  confirmations,
  commitExcelImportRequest,
  fetchResidentList,
  file,
  setDatabaseResidentList,
  setExcelImportCommitSummary
}) {
  const result = await commitExcelImportRequest(file, confirmations);
  const summary = result.summary;

  setExcelImportCommitSummary(summary);

  try {
    const residents = await fetchResidentList();

    setDatabaseResidentList(residents);
    return {
      summary,
      residentRefreshError: null
    };
  } catch (error) {
    return {
      summary,
      residentRefreshError: error
    };
  }
}
