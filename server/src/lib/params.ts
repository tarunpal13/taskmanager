/** Express may type params as `string | string[]`; normalize to a single id. */
export function paramString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}
