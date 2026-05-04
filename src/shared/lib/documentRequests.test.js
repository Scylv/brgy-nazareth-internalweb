import { describe, expect, it } from "vitest";
import {
  countDocumentRequestsByType,
  getDocumentRequestsThisMonth,
  getExpiringSoonCount,
  getRecentDocumentRequests,
  getTotalDocumentRequests
} from "./documentRequests";

const requests = [
  {
    id: "DOC-001",
    residentId: "RBI-001",
    documentType: "Barangay Clearance",
    purpose: "Employment",
    requestDate: "2026-05-03",
    releaseDate: "2026-05-04",
    expiryDate: "2026-05-20",
    status: "Released"
  },
  {
    id: "DOC-002",
    residentId: "RBI-002",
    documentType: "Barangay Indigency",
    purpose: "Medical assistance",
    requestDate: "2026-05-01",
    releaseDate: "",
    expiryDate: "2026-06-15",
    status: "Processing"
  },
  {
    id: "DOC-003",
    residentId: "RBI-001",
    documentType: "Barangay Clearance",
    purpose: "Business permit",
    requestDate: "2026-04-28",
    releaseDate: "2026-04-29",
    expiryDate: "2026-05-04",
    status: "Released"
  },
  {
    id: "DOC-004",
    residentId: "RBI-003",
    documentType: "Certificate of Residency",
    purpose: "School enrollment",
    requestDate: "2026-03-11",
    releaseDate: "2026-03-12",
    expiryDate: "2026-07-01",
    status: "Released"
  }
];

describe("document request metrics", () => {
  it("returns the total request count", () => {
    expect(getTotalDocumentRequests(requests)).toBe(4);
  });

  it("counts requests from the current month", () => {
    expect(getDocumentRequestsThisMonth(requests, new Date("2026-05-04"))).toBe(2);
  });

  it("counts requests by document type", () => {
    expect(countDocumentRequestsByType(requests)).toEqual({
      "Barangay Clearance": 2,
      "Barangay Indigency": 1,
      "Certificate of Residency": 1
    });
  });

  it("sorts recent requests by request date descending", () => {
    expect(getRecentDocumentRequests(requests, 3).map((request) => request.id)).toEqual([
      "DOC-001",
      "DOC-002",
      "DOC-003"
    ]);
  });

  it("counts requests expiring soon from the provided date", () => {
    expect(getExpiringSoonCount(requests, new Date("2026-05-04"), 30)).toBe(2);
  });

  it("recalculates metrics from an updated request collection after adding a request", () => {
    const updatedRequests = [
      {
        id: "DOC-005",
        residentId: "RBI-004",
        documentType: "Barangay ID",
        purpose: "Resident identification",
        requestDate: "2026-05-04",
        releaseDate: "",
        expiryDate: "2026-05-30",
        status: "Processing",
        processedBy: "Elena Ledesma"
      },
      ...requests
    ];

    expect(getTotalDocumentRequests(updatedRequests)).toBe(5);
    expect(getDocumentRequestsThisMonth(updatedRequests, new Date("2026-05-04"))).toBe(3);
    expect(countDocumentRequestsByType(updatedRequests)["Barangay ID"]).toBe(1);
    expect(getExpiringSoonCount(updatedRequests, new Date("2026-05-04"), 30)).toBe(3);
  });
});
