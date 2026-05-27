export function getPaginatedItems(items, { page = 1, pageSize = 10 } = {}) {
  const list = Array.isArray(items) ? items : [];
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.min(Math.max(Number.isInteger(page) ? page : 1, 1), totalPages);
  const start = (safePage - 1) * safePageSize;

  return {
    items: list.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    hasPrevious: safePage > 1,
    hasNext: safePage < totalPages
  };
}

export function getNextPage({ page, totalPages }) {
  return Math.min(page + 1, Math.max(totalPages, 1));
}

export function getPreviousPage({ page }) {
  return Math.max(page - 1, 1);
}

export function shouldResetPaginationPage(previous, next) {
  return previous?.query !== next?.query || previous?.statusFilter !== next?.statusFilter;
}
