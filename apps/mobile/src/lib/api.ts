// Thin fetch wrapper: adds the base URL and token, and turns HTTP errors into ApiError
// so screens can react to specific statuses (401 → log out, 409 → "someone else edited this").
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Set by AuthProvider. Kept at module level so api() can be called from anywhere,
// including React Query functions, without passing the token around.
let token: string | null = null;
let onUnauthorized: () => void = () => {};

export function setAuth(newToken: string | null, handleUnauthorized?: () => void) {
  token = newToken;
  if (handleUnauthorized) onUnauthorized = handleUnauthorized;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE_URL) throw new Error('EXPO_PUBLIC_API_URL is not set');

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    // fetch only throws when the request never got a response: no internet, DNS, server asleep.
    throw new ApiError(0, 'network');
  }

  if (response.status === 401 && token) onUnauthorized();
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message ?? response.statusText);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
