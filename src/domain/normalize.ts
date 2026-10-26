/** Lowercased, accent-free text used for keyword matching ("Suéter Rosa" → "sueter rosa"). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Alphanumeric words after normalization. */
export function tokens(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9ñ]+/)
    .filter((t) => t.length > 0)
}

export function capitalizeFirst(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1)
}

export function uuid(): string {
  return crypto.randomUUID().toUpperCase()
}
