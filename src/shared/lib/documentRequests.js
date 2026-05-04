export function getTotalDocumentRequests(requests) {
  return requests.length;
}

export function getDocumentRequestsThisMonth(requests, currentDate = new Date()) {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  return requests.filter((request) => {
    const requestDate = new Date(request.requestDate);
    return requestDate.getMonth() === currentMonth && requestDate.getFullYear() === currentYear;
  }).length;
}

export function countDocumentRequestsByType(requests) {
  return requests.reduce((counts, request) => {
    counts[request.documentType] = (counts[request.documentType] ?? 0) + 1;
    return counts;
  }, {});
}

export function getRecentDocumentRequests(requests, limit = 5) {
  return [...requests]
    .sort((first, second) => new Date(second.requestDate) - new Date(first.requestDate))
    .slice(0, limit);
}

export function getExpiringSoonCount(requests, currentDate = new Date(), daysAhead = 30) {
  const today = startOfDay(currentDate);
  const cutoffDate = addDays(today, daysAhead);

  return requests.filter((request) => {
    if (!request.expiryDate) {
      return false;
    }

    const expiryDate = startOfDay(new Date(request.expiryDate));
    return expiryDate >= today && expiryDate <= cutoffDate;
  }).length;
}

export function getDocumentRequestsForResident(residentId, requests) {
  return getRecentDocumentRequests(
    requests.filter((request) => request.residentId === residentId),
    requests.length
  );
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
