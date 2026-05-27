import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResidentDocumentPanel, {
  getDocumentDisplayTitle,
  getResidentDocumentUploadPayload,
  getResidentDocumentPage,
  getResidentDocumentViewState,
  getVisibilityWarning,
  removeArchivedResidentDocument,
  shouldShowDocumentTitleField,
  validateResidentDocumentUploadForm
} from "./ResidentDocumentPanel";

const document = {
  id: "RDOC-1",
  residentId: "RBI-2026-0001",
  documentType: "birth_certificate",
  originalFilename: "birth-certificate.pdf",
  mimeType: "application/pdf",
  fileSizeBytes: 2048,
  visibilityScope: "department_visible",
  createdAt: "2026-05-26T00:00:00.000Z",
  viewUrl: "http://localhost:3001/api/resident-documents/RDOC-1"
};
const luponDocumentViews = [
  {
    key: "general",
    label: "General / Vital",
    scopes: ["department_visible", "general_internal"],
    defaultVisibilityScope: "general_internal"
  },
  {
    key: "confidential",
    label: "Lupon Confidential",
    scopes: ["lupon_confidential"],
    defaultVisibilityScope: "lupon_confidential"
  }
];

function renderPanel(props = {}) {
  return renderToStaticMarkup(
    <ResidentDocumentPanel
      initialDocuments={[document]}
      residentId="RBI-2026-0001"
      residentName="Maria Santos"
      {...props}
    />
  );
}

function createDocument(index, overrides = {}) {
  return {
    ...document,
    id: `RDOC-${index}`,
    originalFilename: `document-${index}.pdf`,
    createdAt: `2026-05-${String(index).padStart(2, "0")}T00:00:00.000Z`,
    viewUrl: `http://localhost:3001/api/resident-documents/RDOC-${index}`,
    ...overrides
  };
}

describe("ResidentDocumentPanel", () => {
  it("renders document cards with a single Open action and archive control", () => {
    const markup = renderPanel();

    expect(markup).toContain("birth-certificate.pdf");
    expect(markup).toContain("Open");
    expect(markup).toContain("Archive");
    expect(markup).not.toContain("<table");
    expect(markup).not.toContain("View/Open");
    expect(markup).not.toContain("Download");
  });

  it("renders Admin metadata without content or archive actions", () => {
    const markup = renderPanel({
      metadataOnly: true,
      showUpload: false
    });

    expect(markup).toContain("Metadata only");
    expect(markup).not.toContain("Open");
    expect(markup).not.toContain("Archive");
  });

  it("describes Lupon confidential upload access clearly", () => {
    expect(getVisibilityWarning("lupon_confidential")).toContain("Only Lupon staff");
  });

  it("renders one Lupon document section with category tabs and filtered active documents", () => {
    const markup = renderPanel({
      allowedScopes: ["department_visible", "general_internal", "lupon_confidential"],
      defaultVisibilityScope: "general_internal",
      documentViews: luponDocumentViews,
      initialDocuments: [
        createDocument(1, {
          originalFilename: "shared-vital.pdf",
          visibilityScope: "general_internal"
        }),
        createDocument(2, {
          originalFilename: "case-evidence.png",
          visibilityScope: "lupon_confidential"
        })
      ],
      title: "Documents"
    });

    expect(markup).toContain("Documents");
    expect(markup).toContain("General / Vital");
    expect(markup).toContain("Lupon Confidential");
    expect(markup).toContain("shared-vital.pdf");
    expect(markup).not.toContain("case-evidence.png");
  });

  it("does not render a confidential tab or confidential documents for Department scope", () => {
    const markup = renderPanel({
      allowedScopes: ["department_visible", "general_internal"],
      defaultVisibilityScope: "department_visible",
      documentViews: luponDocumentViews,
      initialDocuments: [
        createDocument(1, {
          originalFilename: "department-visible.pdf",
          visibilityScope: "department_visible"
        }),
        createDocument(2, {
          originalFilename: "hidden-case-evidence.png",
          visibilityScope: "lupon_confidential"
        })
      ]
    });

    expect(markup).toContain("General / Vital");
    expect(markup).not.toContain("Lupon Confidential");
    expect(markup).toContain("department-visible.pdf");
    expect(markup).not.toContain("hidden-case-evidence.png");
  });

  it("sets the upload default scope from the selected document tab", () => {
    const generalState = getResidentDocumentViewState({
      activeViewKey: "general",
      allowedScopes: ["department_visible", "general_internal", "lupon_confidential"],
      defaultVisibilityScope: "general_internal",
      documentViews: luponDocumentViews
    });
    const confidentialState = getResidentDocumentViewState({
      activeViewKey: "confidential",
      allowedScopes: ["department_visible", "general_internal", "lupon_confidential"],
      defaultVisibilityScope: "general_internal",
      documentViews: luponDocumentViews
    });

    expect(generalState.uploadDefaultVisibilityScope).toBe("general_internal");
    expect(confidentialState.uploadDefaultVisibilityScope).toBe("lupon_confidential");
  });

  it("shows five active resident documents per page with latest documents first", () => {
    const markup = renderPanel({
      initialDocuments: [1, 2, 3, 4, 5, 6].map((index) => createDocument(index)),
      showUpload: false
    });

    expect(markup).toContain("Page 1 of 2");
    expect(markup).toContain("Next");
    expect(markup).toContain("document-6.pdf");
    expect(markup).toContain("document-2.pdf");
    expect(markup).not.toContain("document-1.pdf");
  });

  it("calculates next and previous resident document pages", () => {
    const documents = [1, 2, 3, 4, 5, 6].map((index) => createDocument(index));

    expect(getResidentDocumentPage(documents, 1).documents.map((item) => item.id)).toEqual([
      "RDOC-1",
      "RDOC-2",
      "RDOC-3",
      "RDOC-4",
      "RDOC-5"
    ]);
    expect(getResidentDocumentPage(documents, 2).documents.map((item) => item.id)).toEqual([
      "RDOC-6"
    ]);
    expect(getResidentDocumentPage(documents, 3).page).toBe(2);
  });

  it("removes archived documents from the active resident document list", () => {
    const documents = [createDocument(1), createDocument(2)];

    expect(removeArchivedResidentDocument(documents, "RDOC-1")).toEqual([createDocument(2)]);
  });

  it("requires a custom title when uploading an Other document", () => {
    expect(
      validateResidentDocumentUploadForm({
        documentType: "other",
        documentTitle: "",
        file: { name: "other.pdf", size: 128, type: "application/pdf" }
      })
    ).toEqual("Enter a document title or description for Other documents.");
  });

  it("only shows the document title field for Other uploads", () => {
    expect(shouldShowDocumentTitleField("birth_certificate")).toBe(false);
    expect(shouldShowDocumentTitleField("valid_id")).toBe(false);
    expect(shouldShowDocumentTitleField("other")).toBe(true);

    const markup = renderPanel();

    expect(markup).not.toContain("Document title");
  });

  it("allows Other uploads with a custom title and non-Other uploads without one", () => {
    expect(
      validateResidentDocumentUploadForm({
        documentType: "other",
        documentTitle: "Affidavit of Guardianship",
        file: { name: "other.pdf", size: 128, type: "application/pdf" }
      })
    ).toBe("");
    expect(
      validateResidentDocumentUploadForm({
        documentType: "birth_certificate",
        documentTitle: "",
        file: { name: "birth.pdf", size: 128, type: "application/pdf" }
      })
    ).toBe("");
  });

  it("strips stale document titles from non-Other upload payloads", () => {
    const file = { name: "birth.pdf", size: 128, type: "application/pdf" };

    expect(
      getResidentDocumentUploadPayload({
        documentType: "birth_certificate",
        documentTitle: "Should not be sent",
        file,
        visibilityScope: "general_internal"
      })
    ).toEqual({
      documentType: "birth_certificate",
      documentTitle: "",
      file,
      visibilityScope: "general_internal"
    });
    expect(
      getResidentDocumentUploadPayload({
        documentType: "other",
        documentTitle: " Affidavit of Guardianship ",
        file,
        visibilityScope: "general_internal"
      })
    ).toEqual({
      documentType: "other",
      documentTitle: "Affidavit of Guardianship",
      file,
      visibilityScope: "general_internal"
    });
  });

  it("shows custom document titles on cards and confirmation copy", () => {
    expect(
      getDocumentDisplayTitle({
        documentType: "other",
        documentTitle: "Affidavit of Guardianship"
      })
    ).toBe("Other: Affidavit of Guardianship");

    const markup = renderPanel({
      initialDocuments: [
        createDocument(1, {
          documentType: "other",
          documentTitle: "Affidavit of Guardianship",
          originalFilename: "affidavit.pdf"
        })
      ],
      showUpload: false
    });

    expect(markup).toContain("Other: Affidavit of Guardianship");
    expect(markup).toContain("affidavit.pdf");
  });
});
