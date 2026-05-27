import { afterEach, describe, expect, it, vi } from "vitest";
import {
  archiveResidentDocument,
  mapApiResidentDocumentToResidentDocument,
  uploadResidentDocument
} from "./residentDocumentsApi";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("residentDocumentsApi", () => {
  it("maps safe resident document metadata without storage internals", () => {
    const document = mapApiResidentDocumentToResidentDocument({
      id: "RDOC-1",
      residentId: "RBI-2026-0001",
      uploadedByProfileId: "lupon-1",
      uploadedByName: "Juan Santos",
      documentType: "mediation_evidence",
      documentTitle: "Case Evidence",
      originalFilename: "case.png",
      storedFilename: "hidden.png",
      storagePath: "uploads/resident-documents/RBI-2026-0001/hidden.png",
      mimeType: "image/png",
      fileSizeBytes: "1200",
      visibilityScope: "lupon_confidential",
      linkedCaseId: "LC-2026-0001",
      createdAt: "2026-05-26T00:00:00.000Z",
      archivedAt: null
    });

    expect(document).toEqual({
      id: "RDOC-1",
      residentId: "RBI-2026-0001",
      uploadedByProfileId: "lupon-1",
      uploadedByName: "Juan Santos",
      documentType: "mediation_evidence",
      documentTitle: "Case Evidence",
      originalFilename: "case.png",
      mimeType: "image/png",
      fileSizeBytes: 1200,
      visibilityScope: "lupon_confidential",
      linkedCaseId: "LC-2026-0001",
      createdAt: "2026-05-26T00:00:00.000Z",
      archivedAt: null,
      viewUrl: "http://localhost:3001/api/resident-documents/RDOC-1"
    });
    expect(document).not.toHaveProperty("storedFilename");
    expect(document).not.toHaveProperty("storagePath");
  });

  it("archives resident documents through the soft archive endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          document: {
            id: "RDOC-1",
            residentId: "RBI-2026-0001",
            documentType: "birth_certificate",
            originalFilename: "birth.pdf",
            mimeType: "application/pdf",
            fileSizeBytes: 1200,
            visibilityScope: "department_visible",
            archivedAt: "2026-05-26T00:00:00.000Z"
          }
        }),
        {
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const archivedDocument = await archiveResidentDocument("RDOC-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/resident-documents/RDOC-1/archive",
      {
        credentials: "include",
        headers: {
          Accept: "application/json"
        },
        method: "POST"
      }
    );
    expect(archivedDocument.archivedAt).toBe("2026-05-26T00:00:00.000Z");
  });

  it("sends custom document titles during upload using the backend title header", async () => {
    const file = new File(["%PDF-1.7"], "affidavit.pdf", { type: "application/pdf" });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          document: {
            id: "RDOC-2",
            residentId: "RBI-2026-0001",
            documentType: "other",
            documentTitle: "Affidavit of Guardianship",
            originalFilename: "affidavit.pdf",
            mimeType: "application/pdf",
            fileSizeBytes: 8,
            visibilityScope: "general_internal"
          }
        }),
        {
          headers: { "content-type": "application/json" },
          status: 201
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const savedDocument = await uploadResidentDocument("RBI-2026-0001", {
      documentType: "other",
      documentTitle: "Affidavit of Guardianship",
      file,
      visibilityScope: "general_internal"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/residents/RBI-2026-0001/documents",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Document-Title": "Affidavit%20of%20Guardianship"
        })
      })
    );
    expect(savedDocument.documentTitle).toBe("Affidavit of Guardianship");
  });
});
