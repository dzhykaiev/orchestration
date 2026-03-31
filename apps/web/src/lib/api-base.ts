const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export function buildApiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}
