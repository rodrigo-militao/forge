const BASE = "/api";

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

function friendlyError(status: number): string {
  switch (status) {
    case 400: return "Invalid request. Check your input.";
    case 403: return "You don't have permission.";
    case 404: return "Not found.";
    case 429: return "Too many requests. Please wait.";
    case 500: return "Server error. Please try again.";
    default: return "Request failed. Try again.";
  }
}

async function doRequest<T>(path: string, timeoutMs: number, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const merged: RequestInit = {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
    signal: options?.signal || controller.signal,
  };

  let res: Response;
  try {
    res = await fetch(BASE + path, merged);
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Check your connection.");
    }
    throw new Error("Network error. Check your connection.");
  }
  clearTimeout(timeout);

  if (res.status === 401) {
    onUnauthorized?.();
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
    if (currentPath !== "/login" && currentPath !== "/register" && currentPath !== "/") {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("redirectAfterLogin", currentPath);
      }
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? friendlyError(res.status));
  }
  if (res.status === 204) return undefined as unknown as Promise<T>;
  return res.json();
}

export function request<T>(path: string, options?: RequestInit): Promise<T> {
  return doRequest<T>(path, 15000, options);
}

export function longRequest<T>(path: string, options?: RequestInit): Promise<T> {
  return doRequest<T>(path, 60000, options);
}
