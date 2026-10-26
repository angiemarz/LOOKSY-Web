/** Photos chosen in Mi armario waiting to become garments (kept in memory only). */
let pending: File[] = []

export function setPendingImports(files: File[]) {
  pending = files
}

export function getPendingImports(): File[] {
  return pending
}

export function clearPendingImports() {
  pending = []
}
