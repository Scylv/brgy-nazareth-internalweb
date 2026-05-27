import { useEffect, useMemo, useState } from "react";
import Button from "../../../shared/components/Button";
import SectionCard from "../../../shared/components/SectionCard";
import SectionHeader from "../../../shared/components/SectionHeader";
import StateMessage from "../../../shared/components/StateMessage";
import {
  archiveResidentDocument,
  fetchResidentDocuments,
  uploadResidentDocument
} from "../api/residentDocumentsApi";

const documentTypeOptions = [
  ["birth_certificate", "Birth Certificate"],
  ["valid_id", "Valid ID"],
  ["proof_of_residency", "Proof of Residency"],
  ["medical_document", "Medical Document"],
  ["mediation_evidence", "Mediation Evidence"],
  ["other", "Other"]
];

const visibilityLabels = {
  department_visible: "Department visible",
  general_internal: "General internal",
  lupon_confidential: "Lupon confidential",
  admin_only: "Admin only"
};
const visibilityWarnings = {
  department_visible: "Department and Lupon staff can access this file when it is not linked to a Lupon case.",
  general_internal: "Department and Lupon staff can access this file when it is not linked to a Lupon case.",
  lupon_confidential: "Only Lupon staff can open this confidential case file.",
  admin_only: "This file is limited to Admin metadata handling."
};

const supportedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maxUploadBytes = 10 * 1024 * 1024;
export const residentDocumentsPageSize = 5;

export function formatDocumentFileSize(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.ceil(bytes / 1024)} KB`;
}

export function getDocumentTypeLabel(documentType) {
  return documentTypeOptions.find(([value]) => value === documentType)?.[1] ?? documentType;
}

export function getVisibilityLabel(visibilityScope) {
  return visibilityLabels[visibilityScope] ?? visibilityScope;
}

export function getVisibilityWarning(visibilityScope) {
  return visibilityWarnings[visibilityScope] ?? "Only staff with access to this document scope can open this file.";
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function getInitialForm(defaultVisibilityScope) {
  return {
    documentTitle: "",
    documentType: "birth_certificate",
    file: null,
    visibilityScope: defaultVisibilityScope
  };
}

function sortDocumentsLatestFirst(documents) {
  return [...documents].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;

    return rightTime - leftTime;
  });
}

export function getResidentDocumentPage(documents, page, pageSize = residentDocumentsPageSize) {
  const totalPages = Math.max(1, Math.ceil(documents.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    documents: documents.slice(start, start + pageSize),
    page: safePage,
    totalPages
  };
}

export function getResidentDocumentViewState({
  activeViewKey = "",
  allowedScopes,
  defaultVisibilityScope,
  documentViews = []
}) {
  const views = documentViews
    .map((view) => ({
      ...view,
      scopes: view.scopes.filter((scope) => allowedScopes.includes(scope)),
      defaultVisibilityScope: view.defaultVisibilityScope ?? defaultVisibilityScope
    }))
    .filter((view) => view.scopes.length > 0);
  const activeView = views.find((view) => view.key === activeViewKey) ?? views[0] ?? null;
  const activeScopes = activeView?.scopes ?? allowedScopes;
  const uploadDefaultVisibilityScope =
    activeView?.defaultVisibilityScope && activeScopes.includes(activeView.defaultVisibilityScope)
      ? activeView.defaultVisibilityScope
      : activeScopes.includes(defaultVisibilityScope)
        ? defaultVisibilityScope
        : activeScopes[0];

  return {
    activeScopes,
    activeView,
    uploadDefaultVisibilityScope,
    views
  };
}

export function removeArchivedResidentDocument(documents, documentId) {
  return documents.filter((document) => document.id !== documentId);
}

export function getDocumentDisplayTitle(document) {
  const title = String(document?.documentTitle ?? "").trim();

  if (document?.documentType === "other" && title) {
    return `Other: ${title}`;
  }

  return title || getDocumentTypeLabel(document?.documentType);
}

export function shouldShowDocumentTitleField(documentType) {
  return documentType === "other";
}

export function getResidentDocumentUploadPayload(form) {
  return {
    documentTitle: shouldShowDocumentTitleField(form.documentType)
      ? String(form.documentTitle ?? "").trim()
      : "",
    documentType: form.documentType,
    file: form.file,
    visibilityScope: form.visibilityScope
  };
}

export function validateResidentDocumentUploadForm(form) {
  if (!form.file) {
    return "Select a PDF, JPG, JPEG, or PNG document first.";
  }

  if (!supportedTypes.has(form.file.type)) {
    return "Only PDF, JPG, JPEG, and PNG documents are supported.";
  }

  if (form.file.size > maxUploadBytes) {
    return "Document file is too large.";
  }

  if (shouldShowDocumentTitleField(form.documentType) && !String(form.documentTitle ?? "").trim()) {
    return "Enter a document title or description for Other documents.";
  }

  return "";
}

export default function ResidentDocumentPanel({
  allowedScopes = ["department_visible", "general_internal"],
  defaultVisibilityScope = "department_visible",
  description = "",
  documentViews = [],
  initialDocuments = [],
  metadataOnly = false,
  residentId,
  residentName = "",
  showUpload = true,
  title = "Resident Documents"
}) {
  const initialActiveViewKey = documentViews[0]?.key ?? "";
  const initialUploadDefaultVisibilityScope =
    getResidentDocumentViewState({
      activeViewKey: initialActiveViewKey,
      allowedScopes,
      defaultVisibilityScope,
      documentViews
    }).uploadDefaultVisibilityScope ?? defaultVisibilityScope;
  const [documents, setDocuments] = useState(initialDocuments);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState(() => getInitialForm(initialUploadDefaultVisibilityScope));
  const [fileInputKey, setFileInputKey] = useState(0);
  const [pendingArchive, setPendingArchive] = useState(null);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [activeViewKey, setActiveViewKey] = useState(initialActiveViewKey);
  const [currentPage, setCurrentPage] = useState(1);
  const viewState = useMemo(
    () =>
      getResidentDocumentViewState({
        activeViewKey,
        allowedScopes,
        defaultVisibilityScope,
        documentViews
      }),
    [activeViewKey, allowedScopes, defaultVisibilityScope, documentViews]
  );
  const { activeScopes, activeView, uploadDefaultVisibilityScope, views } = viewState;
  const visibleDocuments = useMemo(
    () =>
      sortDocumentsLatestFirst(
        documents.filter((document) => activeScopes.includes(document.visibilityScope))
      ),
    [activeScopes, documents]
  );
  const pagedDocuments = getResidentDocumentPage(visibleDocuments, currentPage);
  const scopeOptions = useMemo(
    () => activeScopes.filter((scope) => Object.prototype.hasOwnProperty.call(visibilityLabels, scope)),
    [activeScopes]
  );

  useEffect(() => {
    setForm(getInitialForm(uploadDefaultVisibilityScope));
    setFileInputKey((current) => current + 1);
  }, [uploadDefaultVisibilityScope, residentId]);

  useEffect(() => {
    if (views.length === 0) {
      if (activeViewKey !== "") {
        setActiveViewKey("");
      }
      return;
    }

    if (!views.some((view) => view.key === activeViewKey)) {
      setActiveViewKey(views[0].key);
    }
  }, [activeViewKey, views]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeViewKey, residentId]);

  useEffect(() => {
    if (currentPage !== pagedDocuments.page) {
      setCurrentPage(pagedDocuments.page);
    }
  }, [currentPage, pagedDocuments.page]);

  useEffect(() => {
    let isActive = true;

    if (!residentId) {
      setDocuments([]);
      return () => {
        isActive = false;
      };
    }

    async function loadDocuments() {
      setIsLoading(true);
      setError("");

      try {
        const loadedDocuments = await fetchResidentDocuments(residentId);

        if (!isActive) {
          return;
        }

        setDocuments(
          sortDocumentsLatestFirst(
            loadedDocuments.filter((document) => allowedScopes.includes(document.visibilityScope))
          )
        );
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setDocuments([]);
        setError(
          loadError?.status === 403
            ? "Access denied for this document area."
            : "Document records could not be loaded."
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadDocuments();

    return () => {
      isActive = false;
    };
  }, [allowedScopes, residentId]);

  function handleViewChange(view) {
    setActiveViewKey(view.key);
    setCurrentPage(1);
    setForm(
      getInitialForm(
        view.scopes.includes(view.defaultVisibilityScope) ? view.defaultVisibilityScope : view.scopes[0]
      )
    );
    setFileInputKey((current) => current + 1);
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "documentType" && !shouldShowDocumentTitleField(value)
        ? { documentTitle: "" }
        : {})
    }));
  }

  function handleFileChange(event) {
    setForm((current) => ({
      ...current,
      file: event.target.files?.[0] ?? null
    }));
  }

  async function handleUpload(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const validationError = validateResidentDocumentUploadForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setPendingUpload(getResidentDocumentUploadPayload(form));
  }

  async function confirmUpload() {
    if (!pendingUpload) {
      return;
    }

    setIsUploading(true);
    setError("");
    setMessage("");

    try {
      const savedDocument = await uploadResidentDocument(residentId, pendingUpload);

      if (allowedScopes.includes(savedDocument.visibilityScope)) {
        setDocuments((current) => sortDocumentsLatestFirst([savedDocument, ...current]));
      }
      setForm(getInitialForm(uploadDefaultVisibilityScope));
      setFileInputKey((current) => current + 1);
      setPendingUpload(null);
      setMessage("Document uploaded.");
    } catch (uploadError) {
      setError(uploadError?.message ?? "Document upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function confirmArchive() {
    if (!pendingArchive) {
      return;
    }

    setIsArchiving(true);
    setError("");
    setMessage("");

    try {
      await archiveResidentDocument(pendingArchive.id);
      setDocuments((current) => removeArchivedResidentDocument(current, pendingArchive.id));
      setPendingArchive(null);
      setMessage("Document archived.");
    } catch (archiveError) {
      setError(archiveError?.message ?? "Document archive failed.");
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <SectionCard>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader description={description} title={title} />
        {visibleDocuments.length > 0 ? (
          <span className="inline-flex w-fit rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gov-700">
            {visibleDocuments.length} active
          </span>
        ) : null}
      </div>

      {views.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Document category">
          {views.map((view) => (
            <button
              aria-selected={activeView?.key === view.key}
              className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                activeView?.key === view.key
                  ? "border-gov-700 bg-gov-700 text-white"
                  : "border-orange-100 bg-white text-slate-700 hover:border-gov-300"
              }`}
              key={view.key}
              onClick={() => handleViewChange(view)}
              role="tab"
              type="button"
            >
              {view.label}
            </button>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <StateMessage className="mt-4" tone="info">
          Loading resident documents...
        </StateMessage>
      ) : null}

      {error ? (
        <StateMessage className="mt-4" tone="danger">
          {error}
        </StateMessage>
      ) : null}

      {message ? (
        <StateMessage className="mt-4" tone="success">
          {message}
        </StateMessage>
      ) : null}

      {!isLoading && visibleDocuments.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 px-4 py-6">
          <p className="text-sm font-semibold text-slate-900">No active documents</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Upload PDF or image files for this resident when supporting records are available.
          </p>
        </div>
      ) : null}

      {visibleDocuments.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {pagedDocuments.documents.map((document) => (
            <article
              className="rounded-2xl border border-orange-100 bg-white p-4"
              key={document.id}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-sm font-semibold text-slate-900">
                      {getDocumentDisplayTitle(document)}
                    </p>
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-gov-700">
                      {getVisibilityLabel(document.visibilityScope)}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-700">
                    {document.originalFilename}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDocumentFileSize(document.fileSizeBytes)}
                    {document.createdAt ? ` - Uploaded ${formatDate(document.createdAt)}` : ""}
                    {document.uploadedByName ? ` - ${document.uploadedByName}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {metadataOnly ? (
                    <span className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Metadata only
                    </span>
                  ) : (
                    <>
                      <a
                        className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-gov-800 transition hover:border-gov-300 hover:bg-orange-50"
                        href={document.viewUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open
                      </a>
                      <Button
                        disabled={isArchiving}
                        onClick={() => setPendingArchive(document)}
                        size="sm"
                        variant="quiet"
                      >
                        Archive
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {visibleDocuments.length > residentDocumentsPageSize ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-600">
            Page {pagedDocuments.page} of {pagedDocuments.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              disabled={pagedDocuments.page === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              size="sm"
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              disabled={pagedDocuments.page === pagedDocuments.totalPages}
              onClick={() => setCurrentPage((page) => Math.min(pagedDocuments.totalPages, page + 1))}
              size="sm"
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {showUpload && !metadataOnly ? (
        <form className="mt-5 grid gap-4 border-t border-orange-100 pt-5 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]" onSubmit={handleUpload}>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Document type
            <select
              className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
              name="documentType"
              onChange={handleFieldChange}
              value={form.documentType}
            >
              {documentTypeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {shouldShowDocumentTitleField(form.documentType) ? (
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Document title
              <input
                className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
                name="documentTitle"
                onChange={handleFieldChange}
                placeholder="Required for Other"
                value={form.documentTitle}
              />
            </label>
          ) : null}

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Visibility
            <select
              className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-gov-500 focus:ring-2 focus:ring-gov-100"
              name="visibilityScope"
              onChange={handleFieldChange}
              value={form.visibilityScope}
            >
              {scopeOptions.map((scope) => (
                <option key={scope} value={scope}>
                  {visibilityLabels[scope]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            File
            <input
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="block w-full rounded-2xl border border-orange-100 bg-white px-4 py-2 text-sm font-normal text-slate-900 file:mr-3 file:rounded-xl file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gov-800"
              key={fileInputKey}
              onChange={handleFileChange}
              type="file"
            />
          </label>

          <div className="flex items-end">
            <Button className="w-full lg:w-auto" disabled={isUploading || !residentId} type="submit">
              {isUploading ? "Uploading" : "Upload"}
            </Button>
          </div>
        </form>
      ) : null}

      {pendingUpload ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-orange-100 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-black text-slate-900">Confirm Document Upload</h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-orange-100 pb-2">
                <dt className="font-semibold text-slate-500">Resident</dt>
                <dd className="text-right text-slate-900">{residentName || residentId}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-orange-100 pb-2">
                <dt className="font-semibold text-slate-500">Document type</dt>
                <dd className="text-right text-slate-900">
                  {getDocumentTypeLabel(pendingUpload.documentType)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-orange-100 pb-2">
                <dt className="font-semibold text-slate-500">Document title</dt>
                <dd className="text-right text-slate-900">{pendingUpload.documentTitle || "Not set"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-orange-100 pb-2">
                <dt className="font-semibold text-slate-500">Visibility</dt>
                <dd className="text-right text-slate-900">
                  {getVisibilityLabel(pendingUpload.visibilityScope)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-orange-100 pb-2">
                <dt className="font-semibold text-slate-500">File</dt>
                <dd className="text-right text-slate-900">{pendingUpload.file.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-semibold text-slate-500">Size</dt>
                <dd className="text-right text-slate-900">
                  {formatDocumentFileSize(pendingUpload.file.size)}
                </dd>
              </div>
            </dl>
            <StateMessage className="mt-4" tone="warning">
              {getVisibilityWarning(pendingUpload.visibilityScope)}
            </StateMessage>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                disabled={isUploading}
                onClick={() => setPendingUpload(null)}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button disabled={isUploading} onClick={confirmUpload}>
                {isUploading ? "Uploading" : "Confirm upload"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingArchive ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-black text-slate-900">Archive Document</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Archive {pendingArchive.originalFilename}? It will be removed from active document
              lists without deleting the stored audit history.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                disabled={isArchiving}
                onClick={() => setPendingArchive(null)}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button disabled={isArchiving} onClick={confirmArchive}>
                {isArchiving ? "Archiving" : "Archive"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
