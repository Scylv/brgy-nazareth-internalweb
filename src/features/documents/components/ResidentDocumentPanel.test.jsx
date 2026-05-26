import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResidentDocumentPanel, {
  getVisibilityWarning
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
});
