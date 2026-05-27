import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResidentRecordForm from "./ResidentRecordForm";

const noop = () => {};
const formData = {
  id: "RBI-2024-0009",
  householdId: "HH-NAZ-0009",
  name: "Imported Resident",
  birthDate: "1990-01-01",
  civilStatus: "Single",
  gender: "Female",
  address: "Purok 9",
  contactNumber: "",
  email: "",
  occupation: "",
  additionalInformation: "",
  sectors: [],
  registeredVoter: false,
  precinctNumber: "",
  status: "yellow",
  documents: []
};

function renderForm(props = {}) {
  return renderToStaticMarkup(
    <ResidentRecordForm
      errors={{}}
      formData={formData}
      mode="edit"
      onCancel={noop}
      onChange={noop}
      onLuponCaseDraftChange={noop}
      onSave={noop}
      {...props}
    />
  );
}

describe("ResidentRecordForm", () => {
  it("keeps the resident ID locked for existing records without staging wording", () => {
    const markup = renderForm();

    expect(markup).toContain("Resident ID is locked to preserve record consistency.");
    expect(markup).not.toContain("staging");
    expect(markup).toContain("readonly");
  });

  it("shows a create Lupon case action when no active case exists", () => {
    const markup = renderForm({
      luponCase: null,
      luponCaseDraft: {
        caseTitle: "",
        confidentialSummary: "",
        isCreating: false
      }
    });

    expect(markup).toContain("No active Lupon case");
    expect(markup).toContain("Create Lupon Case");
    expect(markup).not.toContain("Confidential case summary</span><textarea");
  });

  it("shows editable Lupon case title and summary for a new case draft", () => {
    const markup = renderForm({
      luponCase: null,
      luponCaseDraft: {
        caseTitle: "Imported resident verification",
        confidentialSummary: "Verify imported resident details.",
        isCreating: true
      }
    });

    expect(markup).toContain("Case title");
    expect(markup).toContain("Imported resident verification");
    expect(markup).toContain("Verify imported resident details.");
  });

  it("shows existing case title and summary as editable fields", () => {
    const markup = renderForm({
      luponCase: {
        id: "LC-2026-0009",
        caseNumber: "LPN-2026-0009",
        caseTitle: "Noise complaint",
        caseType: "Community Dispute",
        confidentialSummary: "Existing confidential summary."
      },
      luponCaseDraft: {
        caseTitle: "Noise complaint",
        confidentialSummary: "Existing confidential summary.",
        isCreating: false
      }
    });

    expect(markup).toContain("Noise complaint");
    expect(markup).toContain("Existing confidential summary.");
    expect(markup).toContain("LPN-2026-0009");
  });

  it("shows current active case status and a resolve action for open cases", () => {
    const markup = renderForm({
      luponCase: {
        id: "LC-2026-0009",
        caseNumber: "LPN-2026-0009",
        caseTitle: "Noise complaint",
        caseType: "Community Dispute",
        status: "open",
        confidentialSummary: "Existing confidential summary."
      },
      luponCaseDraft: {
        caseTitle: "Noise complaint",
        confidentialSummary: "Existing confidential summary.",
        isCreating: false
      }
    });

    expect(markup).toContain("Case status");
    expect(markup).toContain("Open");
    expect(markup).toContain("Resolve case");
  });

  it("renders resolve confirmation details before a case can be closed", () => {
    const markup = renderForm({
      isResolveConfirmationOpen: true,
      luponCase: {
        id: "LC-2026-0009",
        caseNumber: "LPN-2026-0009",
        caseTitle: "Noise complaint",
        caseType: "Community Dispute",
        status: "open",
        confidentialSummary: "Existing confidential summary."
      },
      luponCaseDraft: {
        caseTitle: "Noise complaint",
        confidentialSummary: "Existing confidential summary.",
        isCreating: false
      }
    });

    expect(markup).toContain("Resolve Lupon case?");
    expect(markup).toContain("Imported Resident");
    expect(markup).toContain("Noise complaint");
    expect(markup).toContain("LPN-2026-0009");
    expect(markup).toContain("This will close the active Lupon case but preserve its history.");
    expect(markup).toContain("Confirm resolve");
  });

  it("shows no active case after a resolved case is removed from the active form state", () => {
    const markup = renderForm({
      luponCase: null,
      luponCaseDraft: {
        caseTitle: "",
        confidentialSummary: "",
        isCreating: false
      }
    });

    expect(markup).toContain("No active Lupon case");
    expect(markup).toContain("Create Lupon Case");
    expect(markup).not.toContain("Resolve case");
  });

  it("renders the unified resident document panel inside the Lupon record form", () => {
    const markup = renderForm();

    expect(markup).toContain("Documents");
    expect(markup).toContain("General / Vital");
    expect(markup).toContain("Lupon Confidential");
    expect(markup).not.toContain("Documents are managed in the Documents section");
  });

  it("shows Admin import guidance instead of a staging warning for add mode", () => {
    const markup = renderForm({ mode: "add" });

    expect(markup).toContain("New resident records are managed through Admin import/registry tools.");
    expect(markup).toContain("Back to Lupon dashboard");
    expect(markup).not.toContain("Adding new residents is not database-backed yet");
    expect(markup).not.toContain("staging");
    expect(markup).not.toContain("Add resident record");
  });
});
