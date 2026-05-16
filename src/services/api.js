const API = import.meta.env.VITE_API_URL;

class ApiError extends Error {
  constructor(
    message,
    { kind = "unknown", status = null, details = null } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.details = details;
  }
}

function createApiError(message, metadata) {
  return new ApiError(message, metadata);
}

function getErrorMessage(error, fallback = "Something went wrong") {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

function getDisplayError(error, fallback = "Something went wrong") {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(error.message || fallback, {
      kind: "unknown",
      details: error,
    });
  }

  return new ApiError(fallback, { kind: "unknown", details: error });
}

async function fetchJson(path, options) {
  let response;

  try {
    response = await fetch(`${API}${path}`, options);
  } catch (error) {
    throw createApiError(
      "Unable to reach the server. Check that the backend is running.",
      {
        kind: "network",
        details: error,
      },
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const kind =
      response.status === 400
        ? "validation"
        : response.status === 404
          ? "not_found"
          : response.status >= 500
            ? "server"
            : "request";

    throw createApiError(
      data.error || `Request failed with status ${response.status}`,
      {
        kind,
        status: response.status,
        details: data,
      },
    );
  }

  if (data && typeof data === "object" && "success" in data) {
    return "data" in data ? data.data : data;
  }

  return data;
}

function getSongUrl(song) {
  return `${API}/songs/${encodeURIComponent(song)}`;
}

export {
  API,
  ApiError,
  fetchJson,
  getDisplayError,
  getErrorMessage,
  getSongUrl,
};
