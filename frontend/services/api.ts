const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

interface ApiErrorBody { detail?: string | Array<{ msg: string }>; }

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    let message = "The request could not be completed.";
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (typeof body.detail === "string") message = body.detail;
      if (Array.isArray(body.detail)) message = body.detail[0]?.msg ?? message;
    } catch {
      // Keep the safe fallback for non-JSON server responses.
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
