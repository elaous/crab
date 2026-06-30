import type { SceneObject } from '../../types'

/**
 * Generates a print-ready HTML page with:
 *  - Title block (project name, date, author)
 *  - Top/Front/Right SVG orthographic views from the scene
 *  - Bill of materials table
 */

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface PrintOptions {
  sceneName: string
  author?: string
  svgs: { label: string; svg: string }[]   // pre-rendered SVG strings
  objects: Map<string, SceneObject>
  units?: 'metric' | 'imperial'
}

export function openPrintLayout(opts: PrintOptions): void {
  const { sceneName, author = '', svgs, objects, units = 'metric' } = opts
  const now = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  const u = units === 'metric' ? 'm' : 'ft'

  const bomRows = Array.from(objects.values())
    .filter(o => o.visible)
    .map(o => {
      const d = o.dimensions as Record<string, number>
      const w = (d.width ?? d.radius ?? 1).toFixed(2)
      const h = (d.height ?? 1).toFixed(2)
      const dep = (d.depth ?? d.radius ?? 1).toFixed(2)
      return `<tr>
        <td>${escHtml(o.name)}</td>
        <td>${escHtml(o.type)}</td>
        <td>${w} × ${dep} × ${h} ${u}</td>
        <td style="background:${o.color};width:20px"></td>
      </tr>`
    })
    .join('')

  const svgSection = svgs
    .map(({ label, svg }) => `
      <div class="view-box">
        <div class="view-label">${escHtml(label)}</div>
        <div class="view-svg">${svg}</div>
      </div>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escHtml(sceneName)} — Layout</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: sans-serif; font-size: 10pt; color: #111; background: #fff; }
  .page { width: 297mm; min-height: 210mm; padding: 12mm; position: relative; }
  .title-block { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 6pt; margin-bottom: 12pt; }
  .title-block h1 { font-size: 16pt; font-weight: 700; }
  .title-block .meta { text-align: right; font-size: 8pt; color: #555; }
  .views { display: flex; flex-wrap: wrap; gap: 8pt; margin-bottom: 12pt; }
  .view-box { border: 1px solid #ccc; flex: 1 1 40%; min-width: 120mm; }
  .view-label { background: #f0f0f0; padding: 3pt 6pt; font-size: 8pt; font-weight: 600; border-bottom: 1px solid #ccc; }
  .view-svg { padding: 4pt; }
  .view-svg svg { width: 100%; height: auto; max-height: 80mm; }
  h2 { font-size: 10pt; font-weight: 700; margin-bottom: 4pt; }
  table { width: 100%; border-collapse: collapse; font-size: 8pt; }
  th { background: #eee; border: 1px solid #ccc; padding: 2pt 4pt; text-align: left; }
  td { border: 1px solid #ccc; padding: 2pt 4pt; }
  @media print {
    @page { size: A3 landscape; margin: 10mm; }
    .page { width: 100%; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="title-block">
    <div>
      <h1>${escHtml(sceneName)}</h1>
      <div style="font-size:9pt;color:#555;margin-top:3pt">CrabCAD Layout</div>
    </div>
    <div class="meta">
      <div>${escHtml(author)}</div>
      <div>${now}</div>
      <div>Units: ${units}</div>
    </div>
  </div>

  <div class="views">${svgSection}</div>

  <h2>Bill of Materials (${objects.size} objects)</h2>
  <table>
    <thead><tr><th>Name</th><th>Type</th><th>Dimensions</th><th>Color</th></tr></thead>
    <tbody>${bomRows}</tbody>
  </table>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) setTimeout(() => URL.revokeObjectURL(url), 5000)
}
