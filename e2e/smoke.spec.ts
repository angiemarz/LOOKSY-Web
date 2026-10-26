import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))

async function addGarment(page: Page, file: string, name: string, category: string) {
  await page.goto('/armario')
  await page.setInputFiles('input[type=file][multiple]', fixture(file))
  await expect(page.getByAltText('Foto de la prenda')).toBeVisible()
  await page.getByPlaceholder('Ej. Blusa rosa de lino').fill(name)
  await page.locator('select').first().selectOption(category)
  await page.getByRole('button', { name: 'Guardar prenda' }).click()
  await page.waitForURL('**/armario')
}

test('wardrobe → stylist → collage → look → backup', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('/')
  await expect(page.getByText('¿Qué te pondrás hoy?')).toBeVisible()

  await addGarment(page, 'blusa-rosa.jpg', 'Blusa rosa', 'blusas')
  await addGarment(page, 'jeans-negros.jpg', 'Jeans negros', 'jeans')
  await addGarment(page, 'tenis-blancos.jpg', 'Tenis blancos', 'tenis')
  await page.goto('/armario')
  await expect(page.getByText('3 prendas')).toBeVisible()

  // The detected color of the pink blouse is pink (measured on the device).
  await page.getByText('Blusa rosa').click()
  await expect(page.getByText('Rosa', { exact: true })).toBeVisible()

  await page.goto('/crear')
  await page.getByPlaceholder('Ej. algo casual con mis jeans negros para un café').fill('Combina mi blusa rosa con tenis blancos para un café')
  await page.getByRole('button', { name: 'Crear outfits' }).click()
  await expect(page.getByText('Incluir: blusa rosa, tenis blancos')).toBeVisible()
  const card = page.locator('article').first()
  await expect(card).toContainText('Blusa rosa')
  await expect(card).toContainText('Tenis blancos')
  await card.getByRole('button', { name: 'Guardar look' }).click()
  await expect(card.getByText('Guardado en Mis looks')).toBeVisible()

  await card.getByRole('button', { name: 'Editar', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Editor de collage' })
  await expect(editor).toBeVisible()
  await editor.getByRole('radio', { name: '9:16' }).click()
  await editor.getByRole('button', { name: 'Aplicar' }).click()
  await expect(editor).toBeHidden()

  await page.goto('/looks')
  await page.locator('a[href^="/looks/"]').first().click()
  await expect(page.getByText('Por qué funciona')).toBeVisible()

  await page.goto('/inspiracion')
  await page.getByPlaceholder('Ej. vestido floral para brunch').fill('vestido floral para brunch')
  const link = page.locator('a[href*="pinterest.com/search/pins"]').first()
  await expect(link).toHaveAttribute('href', /^https:\/\/www\.pinterest\.com\/search\/pins\/\?q=/)

  await page.goto('/ajustes/respaldo')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Crear respaldo/ }).click()
  const download = await downloadPromise
  const backup = JSON.parse(readFileSync(await download.path(), 'utf8'))
  expect(backup.format).toBe('LOOKSY-backup')
  expect(backup.garments).toHaveLength(3)
  expect(backup.looks).toHaveLength(1)

  expect(errors).toEqual([])
})

test('PWA manifest and service worker', async ({ page }) => {
  await page.goto('/')
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json())
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3)
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()))).toBe(true)
})

test('deep links work (SPA fallback)', async ({ page }) => {
  await page.goto('/ajustes/instalar')
  await expect(page.getByRole('heading', { name: 'Instalar LOOKSY' })).toBeVisible()
})
