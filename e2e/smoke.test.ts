import { test, expect } from '@playwright/test'

test.describe('Facet 3D — smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('app loads and shows the menu bar', async ({ page }) => {
    await expect(page.getByText('◈ Facet 3D')).toBeVisible()
  })

  test('File menu opens and shows expected items', async ({ page }) => {
    await page.getByText('File', { exact: true }).click()
    await expect(page.getByText('New')).toBeVisible()
    await expect(page.getByText('Save')).toBeVisible()
    await expect(page.getByText('Export STL')).toBeVisible()
  })

  test('viewport canvas is present', async ({ page }) => {
    const canvas = page.locator('canvas.viewport-canvas')
    await expect(canvas).toBeVisible()
  })

  test('status bar shows Facet 3D version', async ({ page }) => {
    await expect(page.getByText(/Facet 3D/)).toBeVisible()
  })

  test('add a box from the left sidebar', async ({ page }) => {
    // Dismiss onboarding if present
    const skip = page.getByRole('button', { name: /skip|close|dismiss/i })
    if (await skip.isVisible().catch(() => false)) await skip.click()

    // Click Box button in primitives panel
    const boxBtn = page.getByRole('button', { name: /^box$/i }).first()
    await boxBtn.click()

    // Object tree should now contain an item
    await expect(page.getByText(/Box \d+|Cube|Object/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('keyboard shortcut ? opens shortcuts modal', async ({ page }) => {
    await page.keyboard.press('?')
    await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible({ timeout: 3000 })
  })

  test('Edit menu undo/redo items are present', async ({ page }) => {
    await page.getByText('Edit', { exact: true }).click()
    await expect(page.getByText('Undo')).toBeVisible()
    await expect(page.getByText('Redo')).toBeVisible()
  })

  test('right sidebar tabs are visible', async ({ page }) => {
    // At least some tabs should be visible in the right sidebar
    await expect(page.getByText('Tools').first()).toBeVisible()
  })
})
