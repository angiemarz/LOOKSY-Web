import { colorDistance, type RGB } from './color'

/** Minimal ImageData-like structure so this logic is testable without a canvas. */
export interface PixelImage { width: number; height: number; data: Uint8ClampedArray }

export interface BackgroundResult {
  /** Same size as input; alpha 0 where the background was removed. */
  image: PixelImage
  /** Fraction of pixels kept as foreground. */
  foreground: number
  /** Foreground bounding box in pixels. */
  bounds: { x: number; y: number; width: number; height: number } | null
}

const rgbAt = (img: PixelImage, i: number): RGB => ({ r: img.data[i * 4]! / 255, g: img.data[i * 4 + 1]! / 255, b: img.data[i * 4 + 2]! / 255 })

/**
 * Removes a plain background by flood-filling from the borders: pixels connected
 * to the edge whose color is close to the border color become transparent.
 * Works for garments photographed on a uniform surface (bed, wall, floor);
 * it does not pretend to handle busy backgrounds.
 */
export function removePlainBackground(img: PixelImage, tolerance = 14): BackgroundResult {
  const { width, height } = img
  const total = width * height
  const border: RGB[] = []
  for (let x = 0; x < width; x++) { border.push(rgbAt(img, x)); border.push(rgbAt(img, (height - 1) * width + x)) }
  for (let y = 0; y < height; y++) { border.push(rgbAt(img, y * width)); border.push(rgbAt(img, y * width + width - 1)) }
  const median = (k: keyof RGB) => border.map((c) => c[k]).sort((a, b) => a - b)[Math.floor(border.length / 2)]!
  const bg: RGB = { r: median('r'), g: median('g'), b: median('b') }

  const isBackground = new Uint8Array(total)
  const queue = new Int32Array(total)
  let head = 0, tail = 0
  const push = (i: number) => {
    if (isBackground[i]) return
    if (colorDistance(rgbAt(img, i), bg) > tolerance) return
    isBackground[i] = 1
    queue[tail++] = i
  }
  for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x) }
  for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1) }
  while (head < tail) {
    const i = queue[head++]!
    const x = i % width, y = (i - x) / width
    if (x > 0) push(i - 1)
    if (x < width - 1) push(i + 1)
    if (y > 0) push(i - width)
    if (y < height - 1) push(i + width)
  }

  const out = new Uint8ClampedArray(img.data)
  let kept = 0, minX = width, minY = height, maxX = -1, maxY = -1
  for (let i = 0; i < total; i++) {
    if (isBackground[i]) {
      out[i * 4 + 3] = 0
    } else {
      kept++
      const x = i % width, y = (i - x) / width
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  return {
    image: { width, height, data: out },
    foreground: kept / total,
    bounds: maxX >= minX ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null,
  }
}

/** Whether the removal result is plausible (not everything, not nothing). */
export function isUsableCutout(result: BackgroundResult): boolean {
  return result.bounds !== null && result.foreground > 0.04 && result.foreground < 0.97
}
