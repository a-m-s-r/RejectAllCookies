export function readDocumentCookie(doc: Document, name: string): string | null {
  const prefix = `${name}=`;
  try {
    for (const segment of doc.cookie.split(';')) {
      const trimmed = segment.trim();
      if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
    }
  } catch {
    // Sandboxed opaque-origin frames can deny cookie access.
    return null;
  }
  return null;
}

export function decodeCookieValue(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
