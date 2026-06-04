import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DepartmentDashboard from "./DepartmentDashboard";

const noop = () => {};

function createResident(index, status = "green") {
  return {
    id: `RBI-2024-${String(index).padStart(4, "0")}`,
    householdId: `HH-NAZ-${index}`,
    name: `Resident ${index}`,
    birthDate: "1990-01-01",
    civilStatus: "Single",
    address: `Purok ${index}`,
    status
  };
}

function renderDashboard(props = {}) {
  const residents = props.residents ?? [
    createResident(1),
    createResident(2),
    createResident(3),
    createResident(4),
    createResident(5),
    createResident(6)
  ];

  return renderToStaticMarkup(
    <DepartmentDashboard
      documentRequestError=""
      documentRequests={[]}
      isDocumentRequestLoading={false}
      isResidentLoading={false}
      onDocumentRequestSave={noop}
      onQueryChange={noop}
      onSelectResident={noop}
      onStatusFilterChange={noop}
      query=""
      residentDataSource="Database API"
      residentError=""
      residentSearchResidents={residents}
      residents={residents}
      results={residents}
      statusFilter="all"
      {...props}
    />
  );
}

describe("DepartmentDashboard", () => {
  it("paginates resident search results without changing the full result count", () => {
    const markup = renderDashboard();

    expect(markup).toContain("6 residents found");
    expect(markup).toContain("Resident 1");
    expect(markup).toContain("Resident 5");
    expect(markup).not.toContain("Resident 6");
    expect(markup).toContain("Page 1 of 2");
    expect(markup).toContain("Previous");
    expect(markup).toContain("Next");
  });

  it("renders request registry controls and opens the new request panel from state", () => {
    const markup = renderDashboard({ initialDocumentFormOpen: true });

    expect(markup).toContain("Search requests");
    expect(markup).toContain("Status");
    expect(markup).toContain("Document Type");
    expect(markup).toContain("New Document Request");
    expect(markup).toContain("Create Request");
  });

  it("filters document requests by search, status, and document type", () => {
    const markup = renderDashboard({
      initialRequestSearch: "medical",
      initialRequestStatusFilter: "released",
      initialRequestDocumentTypeFilter: "Barangay Indigency",
      documentRequests: [
        {
          id: "DOC-1",
          residentId: "RBI-2024-0001",
          documentType: "Barangay Indigency",
          purpose: "Medical assistance",
          requestDate: "2026-05-20",
          releaseDate: "2026-05-21",
          expiryDate: "",
          status: "released",
          processedBy: "Elena Ledesma"
        },
        {
          id: "DOC-2",
          residentId: "RBI-2024-0002",
          documentType: "Barangay Clearance",
          purpose: "Local employment",
          requestDate: "2026-05-19",
          releaseDate: "",
          expiryDate: "",
          status: "pending",
          processedBy: "Elena Ledesma"
        }
      ]
    });

    expect(markup).toContain("Medical assistance");
    expect(markup).not.toContain("Local employment");
    expect(markup).toContain("1 request shown");
  });

  it("paginates document requests five per page", () => {
    const documentRequests = Array.from({ length: 6 }, (_, index) => ({
      id: `DOC-${index + 1}`,
      residentId: `RBI-2024-${String(index + 1).padStart(4, "0")}`,
      documentType: "Barangay Clearance",
      purpose: `Purpose ${index + 1}`,
      requestDate: `2026-05-${String(index + 1).padStart(2, "0")}`,
      releaseDate: "",
      expiryDate: "",
      status: "pending",
      processedBy: "Elena Ledesma"
    }));

    const markup = renderDashboard({ documentRequests });

    expect(markup).toContain("Purpose 1");
    expect(markup).toContain("Purpose 5");
    expect(markup).not.toContain("Purpose 6");
    expect(markup).toContain("Page 1 of 2");
  });

  it("resets document request pagination when filters change", () => {
    const documentRequests = Array.from({ length: 6 }, (_, index) => ({
      id: `DOC-${index + 1}`,
      residentId: `RBI-2024-${String(index + 1).padStart(4, "0")}`,
      documentType: index === 5 ? "Barangay Indigency" : "Barangay Clearance",
      purpose: `Purpose ${index + 1}`,
      requestDate: `2026-05-${String(index + 1).padStart(2, "0")}`,
      releaseDate: "",
      expiryDate: "",
      status: "pending",
      processedBy: "Elena Ledesma"
    }));

    const markup = renderDashboard({
      documentRequests,
      initialDocumentRequestPage: 2,
      initialRequestDocumentTypeFilter: "Barangay Indigency"
    });

    expect(markup).toContain("Purpose 6");
    expect(markup).not.toContain("Page 2 of");
  });

  it("renders release and archive confirmation states", () => {
    const documentRequests = [
      {
        id: "DOC-1",
        residentId: "RBI-2024-0001",
        documentType: "Barangay Clearance",
        purpose: "Local employment",
        requestDate: "2026-05-20",
        releaseDate: "",
        expiryDate: "",
        status: "pending",
        processedBy: "Elena Ledesma"
      }
    ];

    const releaseMarkup = renderDashboard({
      documentRequests,
      initialReleaseConfirmationId: "DOC-1"
    });
    expect(releaseMarkup).toContain("Confirm Release");
    expect(releaseMarkup).toContain("release date will be set to today");

    const archiveMarkup = renderDashboard({
      documentRequests,
      initialArchiveConfirmationId: "DOC-1"
    });
    expect(archiveMarkup).toContain("Archive Request");
    expect(archiveMarkup).toContain("Archive reason");
    expect(archiveMarkup).toContain("Duplicate request");
  });

  it("renders a searchable resident picker with filtered results and selected resident", () => {
    const markup = renderDashboard({
      initialDocumentFormOpen: true,
      initialResidentPickerSearch: "resident 2",
      initialDocumentForm: {
        residentId: "RBI-2024-0002"
      }
    });

    expect(markup).toContain("Search resident");
    expect(markup).toContain("Selected resident");
    expect(markup).toContain("Resident 2");
    expect(markup).not.toContain("Resident 6");
    expect(markup).not.toContain('name="residentId"');
  });

  it("blocks request submission state when no resident is selected", () => {
    const markup = renderDashboard({
      initialDocumentFormOpen: true,
      initialDocumentForm: {
        residentId: ""
      },
      initialDocumentFormError: "Select a resident before creating a request."
    });

    expect(markup).toContain("Select a resident before creating a request.");
  });

  it("shows the required Other custom title field and validation message", () => {
    const markup = renderDashboard({
      initialDocumentFormOpen: true,
      initialDocumentForm: {
        barangayDocumentId: "BDOC-OTHER",
        documentType: "Other",
        customDocumentTitle: ""
      },
      initialDocumentFormError: "Custom document title is required for Other requests."
    });

    expect(markup).toContain("Requested document title");
    expect(markup).toContain("Custom document title is required for Other requests.");
  });

  it("renders Other requests with the custom display title", () => {
    const markup = renderDashboard({
      documentRequests: [
        {
          id: "DOC-OTHER-1",
          residentId: "RBI-2024-0001",
          documentType: "Other",
          displayDocumentType: "Other: Travel Certification",
          customDocumentTitle: "Travel Certification",
          purpose: "Custom certification",
          requestDate: "2026-05-27",
          releaseDate: "",
          expiryDate: "",
          status: "pending",
          processedBy: "Elena Ledesma"
        }
      ]
    });

    expect(markup).toContain("Other: Travel Certification");
  });

  it("displays backend validation errors clearly", () => {
    const markup = renderDashboard({
      documentRequestError: "Release date cannot be before request date."
    });

    expect(markup).toContain("Release date cannot be before request date.");
  });
});
