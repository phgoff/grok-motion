/** Reads a local storage key. A blocked storage area returns null. */
export function readStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
