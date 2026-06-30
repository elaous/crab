#!/usr/bin/env node
/**
 * Headless batch render — takes a .crab scene file and exports PNG screenshots.
 *
 * Usage:
 *   npx tsx scripts/render.ts scene.crab [--view top|front|right|iso] [--out out.png] [--width 1920] [--height 1080]
 *
 * Requirements: chromium (PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers)
 *   npm install --save-dev playwright tsx
 *
 * The script:
 *  1. Starts the Vite dev server (or uses CRAB_URL env var for a running instance).
 *  2. Opens the app in headless Chromium.
 *  3. Loads the scene file via the app's file-import mechanism.
 *  4. Sets the requested view preset.
 *  5. Captures a high-res screenshot and writes it to disk.
 */

import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, basename } from 'path'
import { spawn } from 'child_process'

const args = process.argv.slice(2)

function flag(name: string, fallback: string): string {
  const idx = args.indexOf(name)
  return idx !== -1 ? args[idx + 1] : fallback
}

const sceneFile = args.find(a => !a.startsWith('--'))
const view      = flag('--view', 'iso') as 'top' | 'front' | 'right' | 'iso'
const outFile   = flag('--out', sceneFile ? basename(sceneFile, '.crab') + '_' + view + '.png' : 'render.png')
const width     = parseInt(flag('--width', '1920'))
const height    = parseInt(flag('--height', '1080'))
const baseUrl   = process.env.CRAB_URL ?? 'http://localhost:5173'

if (!sceneFile) {
  console.error('Usage: npx tsx scripts/render.ts <scene.crab> [--view iso] [--out render.png] [--width 1920] [--height 1080]')
  process.exit(1)
}

async function waitForServer(url: string, ms = 30_000): Promise<void> {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url)
      if (r.ok) return
    } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Dev server not ready at ${url} after ${ms}ms`)
}

;(async () => {
  // Start dev server if CRAB_URL not set
  let devProcess: ReturnType<typeof spawn> | null = null
  if (!process.env.CRAB_URL) {
    console.log('Starting Vite dev server…')
    devProcess = spawn('npm', ['run', 'dev', '--', '--port', '5173'], {
      stdio: 'pipe',
      cwd: resolve(import.meta.dirname, '..'),
    })
    await waitForServer(baseUrl)
    console.log('Dev server ready.')
  }

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_BROWSERS_PATH
      ? `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium`
      : undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewportSize({ width, height })
    await page.goto(baseUrl, { waitUntil: 'networkidle' })

    // Load the scene by triggering file input with the binary blob
    const sceneBytes = readFileSync(resolve(sceneFile))
    await page.evaluate(async ([bytes, name]: [number[], string]) => {
      const buf = new Uint8Array(bytes)
      const file = new File([buf], name, { type: 'application/octet-stream' })
      const dt = new DataTransfer()
      dt.items.add(file)
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', { value: dt.files })
      // Dispatch a change event that the app's open handler can read
      ;(window as Window & { __headlessFile?: File }).__headlessFile = file
      window.dispatchEvent(new CustomEvent('crab:headless-load', { detail: { file } }))
    }, [Array.from(sceneBytes), basename(sceneFile)] as [number[], string])

    // Wait for canvas to stabilise
    await page.waitForTimeout(2000)

    // Set view preset via console
    await page.evaluate((v: string) => {
      ;(window as Window & { __crabStore?: { getState: () => { setViewPreset: (v: string) => void } } }).__crabStore?.getState().setViewPreset(v)
    }, view)

    await page.waitForTimeout(800)

    // Capture
    const screenshot = await page.screenshot({ type: 'png' })
    writeFileSync(resolve(outFile), screenshot)
    console.log(`Rendered → ${outFile} (${width}×${height}, view: ${view})`)
  } finally {
    await browser.close()
    devProcess?.kill()
  }
})().catch(err => { console.error(err); process.exit(1) })
