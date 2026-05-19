const DEFAULT_API_BASE_URL = "http://localhost:3001";
const DEVELOPMENT_ROLE = "department";

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function getApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(getApiUrl(path), {
    ...options,
    headers: {
      Accept: "application/json",
      "x-user-role": DEVELOPMENT_ROLE,
      ...options.headers
    }
  });
  const body = await parseResponse(response);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? body.error
        : `API request failed with status ${response.status}.`;

    throw new ApiError(message, {
      status: response.status,
      body
    });
  }

  return body;
}
