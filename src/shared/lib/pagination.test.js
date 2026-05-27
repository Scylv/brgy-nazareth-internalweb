import { describe, expect, it } from "vitest";
import {
  getNextPage,
  getPaginatedItems,
  getPreviousPage,
  shouldResetPaginationPage
} from "./pagination";

describe("pagination helpers", () => {
  it("returns a safe page of items with previous and next state", () => {
    const result = getPaginatedItems(["a", "b", "c", "d", "e", "f"], {
      page: 1,
      pageSize: 5
    });

    expect(result).toEqual({
      items: ["a", "b", "c", "d", "e"],
      page: 1,
      pageSize: 5,
      totalItems: 6,
      totalPages: 2,
      hasPrevious: false,
      hasNext: true
    });
  });

  it("moves to next and previous pages without exceeding boundaries", () => {
    expect(getNextPage({ page: 1, totalPages: 2 })).toBe(2);
    expect(getNextPage({ page: 2, totalPages: 2 })).toBe(2);
    expect(getPreviousPage({ page: 2 })).toBe(1);
    expect(getPreviousPage({ page: 1 })).toBe(1);
  });

  it("clamps invalid and empty input to a stable first page", () => {
    expect(getPaginatedItems(null, { page: 9, pageSize: 5 })).toMatchObject({
      items: [],
      page: 1,
      totalItems: 0,
      totalPages: 1,
      hasPrevious: false,
      hasNext: false
    });
  });

  it("resets pagination when search or filter values change", () => {
    expect(
      shouldResetPaginationPage(
        { query: "maria", statusFilter: "all" },
        { query: "juan", statusFilter: "all" }
      )
    ).toBe(true);
    expect(
      shouldResetPaginationPage(
        { query: "maria", statusFilter: "all" },
        { query: "maria", statusFilter: "yellow" }
      )
    ).toBe(true);
    expect(
      shouldResetPaginationPage(
        { query: "maria", statusFilter: "all" },
        { query: "maria", statusFilter: "all" }
      )
    ).toBe(false);
  });
});
