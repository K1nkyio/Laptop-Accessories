const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export { API_URL };

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (_error) {
    throw new Error("Could not connect to the API. Make sure the Express server is running on port 4000.");
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload as T;
}

export async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  } catch (_error) {
    throw new Error("Could not connect to the API. Make sure the Express server is running on port 4000.");
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Upload failed");
  }

  return payload as T;
}
