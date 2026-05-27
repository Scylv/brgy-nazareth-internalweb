import { afterEach, describe, expect, it, vi } from "vitest";
import {
  archiveDocumentRequest,
  createDocumentRequest,
  fetchDocumentRequests,
  markDocumentRequestProcessing,
  markDocumentRequestReleased,
  mapApiDocumentRequestToDocumentRequest,
  toDocumentRequestCreatePayload
} from "./documentRequestsApi";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("department document request API", () => {
  it("maps backend document request fields to the frontend format", () => {
    const request = mapApiDocumentRequestToDocumentRequest({
      id: "DOC-2026-0007",
      residentId: "RBI-2024-0001",
      barangayDocumentId: "BDOC-001",
      barangayDocumentName: "Barangay Clearance",
      residentName: "Ana Reyes",
      customDocumentTitle: null,
      purpose: "Local employment requirement",
      status: "processing",
      requestDate: "2026-05-18",
      releaseDate: null,
      expiryDate: "2026-11-18",
      processedByProfileId: "dept-1",
      processedByName: "Elena Ledesma"
    });

    expect(request).toEqual({
      id: "DOC-2026-0007",
      residentId: "RBI-2024-0001",
      residentName: "Ana Reyes",
      barangayDocumentId: "BDOC-001",
      documentType: "Barangay Clearance",
      displayDocumentType: "Barangay Clearance",
      customDocumentTitle: "",
      purpose: "Local employment requirement",
      requestDate: "2026-05-18",
      releaseDate: "",
      expiryDate: "2026-11-18",
      status: "processing",
      processedBy: "Elena Ledesma",
      processedByProfileId: "dept-1",
      archived: false,
      archivedAt: "",
      archiveReason: "",
      archiveNote: ""
    });
  });

  it("fetches document requests with the authenticated session and maps them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            documentRequests: [
              {
                id: "DOC-2026-0008",
                residentId: "RBI-2024-0002",
                barangayDocumentId: "BDOC-003",
                barangayDocumentName: "Barangay Indigency",
                purpose: "Medical assistance",
                status: "released",
                requestDate: "2026-05-20",
                releaseDate: "2026-05-21",
                expiryDate: null,
                processedByName: "Elena Ledesma"
              }
            ]
          }),
          {
            headers: { "content-type": "application/json" }
          }
        )
      )
    );

    await expect(fetchDocumentRequests()).resolves.toEqual([
      expect.objectContaining({
        id: "DOC-2026-0008",
        documentType: "Barangay Indigency",
        releaseDate: "2026-05-21",
        expiryDate: "",
        status: "released"
      })
    ]);
  });

  it("normalizes create payloads to backend lowercase statuses", () => {
    expect(
      toDocumentRequestCreatePayload({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-19",
        releaseDate: "",
        expiryDate: "",
        status: "Released",
        processedBy: "Elena Ledesma"
      })
    ).toEqual({
      residentId: "RBI-2024-0001",
      barangayDocumentId: "BDOC-001",
      customDocumentTitle: null,
      purpose: "Local employment requirement",
      requestDate: "2026-05-19",
      releaseDate: null,
      expiryDate: null,
      status: "released"
    });
  });

  it("creates document requests without header-based role or profile identity", async () => {
    const fetchMock = vi.fn(async (_url, options) => {
      expect(options.method).toBe("POST");
      expect(options.headers).toEqual({
        Accept: "application/json",
        "Content-Type": "application/json"
      });
      expect(JSON.parse(options.body)).toEqual({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        customDocumentTitle: null,
        purpose: "Local employment requirement",
        requestDate: "2026-05-19",
        releaseDate: null,
        expiryDate: null,
        status: "pending"
      });

      return new Response(
        JSON.stringify({
          documentRequest: {
            id: "DOC-2026-0009",
            residentId: "RBI-2024-0001",
            barangayDocumentId: "BDOC-001",
            barangayDocumentName: "Barangay Clearance",
            purpose: "Local employment requirement",
            status: "pending",
            requestDate: "2026-05-19",
            releaseDate: null,
            expiryDate: null,
            processedByProfileId: "dept-1",
            processedByName: "Elena Ledesma"
          }
        }),
        {
          status: 201,
          headers: { "content-type": "application/json" }
        }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createDocumentRequest({
        residentId: "RBI-2024-0001",
        documentType: "Barangay Clearance",
        purpose: "Local employment requirement",
        requestDate: "2026-05-19",
        status: "Pending"
      })
    ).resolves.toMatchObject({
      id: "DOC-2026-0009",
      documentType: "Barangay Clearance",
      status: "pending",
      processedBy: "Elena Ledesma"
    });
  });

  it("rejects unknown document types before posting invalid data", () => {
    expect(() =>
      toDocumentRequestCreatePayload({
        residentId: "RBI-2024-0001",
        documentType: "Unknown Certificate",
        purpose: "Local employment requirement",
        requestDate: "2026-05-19",
        status: "pending"
      })
    ).toThrow("Unknown barangay document type");
  });

  it("maps Other document requests to a custom display title and payload", () => {
    expect(
      mapApiDocumentRequestToDocumentRequest({
        id: "DOC-OTHER-1",
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-OTHER",
        barangayDocumentName: "Other",
        customDocumentTitle: "Travel Certification",
        purpose: "Custom certification",
        status: "pending",
        requestDate: "2026-05-27"
      })
    ).toMatchObject({
      documentType: "Other",
      displayDocumentType: "Other: Travel Certification",
      customDocumentTitle: "Travel Certification"
    });

    expect(
      toDocumentRequestCreatePayload({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-OTHER",
        customDocumentTitle: "  Travel Certification  ",
        purpose: "Custom certification",
        requestDate: "2026-05-27",
        status: "pending"
      })
    ).toMatchObject({
      barangayDocumentId: "BDOC-OTHER",
      customDocumentTitle: "Travel Certification"
    });
  });

  it("rejects invalid create date combinations before posting", () => {
    expect(() =>
      toDocumentRequestCreatePayload({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-27",
        releaseDate: "2026-05-19",
        status: "pending"
      })
    ).toThrow("Release date cannot be before request date");
  });

  it("marks document requests processing through the authenticated API", async () => {
    const fetchMock = vi.fn(async (_url, options) => {
      expect(_url).toContain("/api/document-requests/DOC-1/mark-processing");
      expect(options.method).toBe("POST");

      return new Response(
        JSON.stringify({
          documentRequest: {
            id: "DOC-1",
            residentId: "RBI-2024-0001",
            barangayDocumentId: "BDOC-001",
            barangayDocumentName: "Barangay Clearance",
            purpose: "Local employment",
            status: "processing",
            requestDate: "2026-05-20",
            releaseDate: null,
            expiryDate: null
          }
        }),
        { headers: { "content-type": "application/json" } }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(markDocumentRequestProcessing("DOC-1")).resolves.toMatchObject({
      id: "DOC-1",
      status: "processing"
    });
  });

  it("marks document requests released through the authenticated API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, options) => {
        expect(_url).toContain("/api/document-requests/DOC-1/mark-released");
        expect(options.method).toBe("POST");

        return new Response(
          JSON.stringify({
            documentRequest: {
              id: "DOC-1",
              residentId: "RBI-2024-0001",
              barangayDocumentId: "BDOC-001",
              barangayDocumentName: "Barangay Clearance",
              purpose: "Local employment",
              status: "released",
              requestDate: "2026-05-20",
              releaseDate: "2026-05-27",
              expiryDate: null
            }
          }),
          { headers: { "content-type": "application/json" } }
        );
      })
    );

    await expect(markDocumentRequestReleased("DOC-1")).resolves.toMatchObject({
      id: "DOC-1",
      status: "released",
      releaseDate: "2026-05-27"
    });
  });

  it("archives document requests with a reason payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, options) => {
        expect(_url).toContain("/api/document-requests/DOC-1/archive");
        expect(options.method).toBe("POST");
        expect(JSON.parse(options.body)).toEqual({
          reason: "Duplicate request",
          note: "Encoded twice."
        });

        return new Response(
          JSON.stringify({
            documentRequest: {
              id: "DOC-1",
              residentId: "RBI-2024-0001",
              barangayDocumentId: "BDOC-001",
              barangayDocumentName: "Barangay Clearance",
              purpose: "Local employment",
              status: "released",
              requestDate: "2026-05-20",
              releaseDate: "2026-05-27",
              expiryDate: null,
              archived: true,
              archiveReason: "Duplicate request"
            }
          }),
          { headers: { "content-type": "application/json" } }
        );
      })
    );

    await expect(
      archiveDocumentRequest("DOC-1", { reason: "Duplicate request", note: "Encoded twice." })
    ).resolves.toMatchObject({
      id: "DOC-1",
      archived: true,
      archiveReason: "Duplicate request"
    });
  });
});
