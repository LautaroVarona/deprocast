export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const raw = await response.text();

  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(
      response.ok
        ? "La respuesta del servidor no es JSON válido."
        : `Error del servidor (${response.status}).`,
    );
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Error ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}
