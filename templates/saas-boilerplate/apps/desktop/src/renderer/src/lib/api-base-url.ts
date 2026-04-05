const DEFAULT_API_BASE_URL = "http://localhost:3000";
const TRPC_PATH_SUFFIX = "/api/trpc";

export const normalizeApiBaseUrl = (rawUrl?: string): string => {
  const trimmedUrl = rawUrl?.trim();
  if (!trimmedUrl) {
    return DEFAULT_API_BASE_URL;
  }

  return trimmedUrl.endsWith(TRPC_PATH_SUFFIX)
    ? trimmedUrl.slice(0, -TRPC_PATH_SUFFIX.length)
    : trimmedUrl;
};

export const buildTrpcUrl = (rawUrl?: string): string => {
  return `${normalizeApiBaseUrl(rawUrl)}${TRPC_PATH_SUFFIX}`;
};
