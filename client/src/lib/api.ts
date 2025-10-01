const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function apiRequest(
  method: string,
  endpoint: string,
  data?: unknown,
  token?: string
): Promise<Response> {
  const headers: HeadersInit = {};

  if (data && !(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
}

export async function uploadFile(file: File, folder: string, token: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await apiRequest("POST", "/api/upload", formData, token);
  return res.json();
}
