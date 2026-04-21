// Typed API response envelope for all /api/ routes.
// Enables consistent error handling for future mobile / external consumers.

export type ApiResponse<T> =
  | { success: true;  data: T }
  | { success: false; error: string };

/** Wrap a successful payload */
export function apiOk<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

/** Wrap an error message */
export function apiErr(error: string): ApiResponse<never> {
  return { success: false, error };
}
