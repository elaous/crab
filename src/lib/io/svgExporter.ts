import type { SceneObject, BoxDims, SphereDims, CylinderDims, ConeDims } from '../../types'

type ViewAxis = 'top' | 'front' | 'right'

interface Bounds {
  minX: number; minY: number; maxX: number; maxY: number
}

function projectPoint(
  px: number, py: number, pz: number,
  view: ViewAxis,
): [number, number] {
  switch (view) {
    case 'top':   return [px, -pz]  // top-down: X right, -Z up
    case 'front': return [px, -py]  // front: X right, -Y up
    case 'right': return [-pz, -py] // right: -Z right, -Y up
  }
}

function getBoundsForView(
  objects: Map<string, SceneObject>,
  view: ViewAxis,
): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  objects.forEach(obj => {
    const p = obj.position
    let halfW = 0.5, halfH = 0.5, halfD = 0.5
    if (obj.type === 'box') {
      const d = obj.dimensions as BoxDims
      halfW = d.width / 2; halfH = d.height / 2; halfD = d.depth / 2
    } else if (obj.type === 'sphere') {
      const d = obj.dimensions as SphereDims
      halfW = d.radius; halfH = d.radius; halfD = d.radius
    } else if (obj.type === 'cylinder' || obj.type === 'cone') {
      const d = obj.dimensions as CylinderDims | ConeDims
      halfW = d.radius; halfH = d.height / 2; halfD = d.radius
    }

    const corners = [
      [p.x - halfW, p.y - halfH, p.z - halfD],
      [p.x + halfW, p.y - halfH, p.z - halfD],
      [p.x - halfW, p.y + halfH, p.z - halfD],
      [p.x + halfW, p.y + halfH, p.z - halfD],
      [p.x - halfW, p.y - halfH, p.z + halfD],
      [p.x + halfW, p.y - halfH, p.z + halfD],
      [p.x - halfW, p.y + halfH, p.z + halfD],
      [p.x + halfW, p.y + halfH, p.z + halfD],
    ]
    for (const [cx, cy, cz] of corners) {
      const [sx, sy] = projectPoint(cx, cy, cz, view)
      minX = Math.min(minX, sx); minY = Math.min(minY, sy)
      maxX = Math.max(maxX, sx); maxY = Math.max(maxY, sy)
    }
  })

  if (!isFinite(minX)) return { minX: -1, minY: -1, maxX: 1, maxY: 1 }
  return { minX, minY, maxX, maxY }
}

function renderView(
  objects: Map<string, SceneObject>,
  view: ViewAxis,
  vpW: number,
  vpH: number,
  offsetX: number,
  offsetY: number,
): string {
  const bounds = getBoundsForView(objects, view)
  const pad = 20
  const sceneW = bounds.maxX - bounds.minX || 2
  const sceneH = bounds.maxY - bounds.minY || 2
  const scaleX = (vpW - pad * 2) / sceneW
  const scaleY = (vpH - pad * 2) / sceneH
  const scale = Math.min(scaleX, scaleY)

  const toSvgX = (x: number) => (x - bounds.minX) * scale + pad + offsetX
  const toSvgY = (y: number) => (y - bounds.minY) * scale + pad + offsetY

  let svg = ''

  // Background rect
  svg += `<rect x="${offsetX}" y="${offsetY}" width="${vpW}" height="${vpH}" fill="#1a2035" stroke="#334155" stroke-width="1"/>`

  // Label
  svg += `<text x="${offsetX + 4}" y="${offsetY + 14}" font-family="monospace" font-size="11" fill="#64748b">${view.toUpperCase()}</text>`

  objects.forEach(obj => {
    const p = obj.position

    if (obj.type === 'box') {
      const d = obj.dimensions as BoxDims
      const halfW = d.width / 2
      const halfH = d.height / 2
      const halfD = d.depth / 2

      const corners: Array<[number, number, number]> = [
        [p.x - halfW, p.y - halfH, p.z - halfD],
        [p.x + halfW, p.y - halfH, p.z - halfD],
        [p.x + halfW, p.y + halfH, p.z - halfD],
        [p.x - halfW, p.y + halfH, p.z - halfD],
        [p.x - halfW, p.y - halfH, p.z + halfD],
        [p.x + halfW, p.y - halfH, p.z + halfD],
        [p.x + halfW, p.y + halfH, p.z + halfD],
        [p.x - halfW, p.y + halfH, p.z + halfD],
      ]

      const projected = corners.map(([cx, cy, cz]) => {
        const [sx, sy] = projectPoint(cx, cy, cz, view)
        return [toSvgX(sx), toSvgY(sy)]
      })

      // Draw silhouette: compute bounding rect of projected corners
      const xs = projected.map(p2 => p2[0])
      const ys = projected.map(p2 => p2[1])
      const rx = Math.min(...xs)
      const ry = Math.min(...ys)
      const rw = Math.max(...xs) - rx
      const rh = Math.max(...ys) - ry
      svg += `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${obj.color}33" stroke="${obj.color}" stroke-width="1.5"/>`
    } else if (obj.type === 'sphere') {
      const d = obj.dimensions as SphereDims
      const [cx, cy] = projectPoint(p.x, p.y, p.z, view)
      const r = d.radius * scale
      svg += `<circle cx="${toSvgX(cx).toFixed(1)}" cy="${toSvgY(cy).toFixed(1)}" r="${r.toFixed(1)}" fill="${obj.color}33" stroke="${obj.color}" stroke-width="1.5"/>`
    } else if (obj.type === 'cylinder') {
      const d = obj.dimensions as CylinderDims
      const halfR = d.radius
      const halfH2 = d.height / 2

      if (view === 'top') {
        const [cx2, cy2] = projectPoint(p.x, p.y, p.z, view)
        const r = halfR * scale
        svg += `<circle cx="${toSvgX(cx2).toFixed(1)}" cy="${toSvgY(cy2).toFixed(1)}" r="${r.toFixed(1)}" fill="${obj.color}33" stroke="${obj.color}" stroke-width="1.5"/>`
      } else {
        // front or right: rectangle
        const corners: Array<[number, number, number]> = [
          [p.x - halfR, p.y - halfH2, p.z - halfR],
          [p.x + halfR, p.y - halfH2, p.z + halfR],
          [p.x + halfR, p.y + halfH2, p.z + halfR],
          [p.x - halfR, p.y + halfH2, p.z - halfR],
        ]
        const projected = corners.map(([cx2, cy2, cz2]) => {
          const [sx, sy] = projectPoint(cx2, cy2, cz2, view)
          return [toSvgX(sx), toSvgY(sy)]
        })
        const xs = projected.map(p2 => p2[0])
        const ys = projected.map(p2 => p2[1])
        const rx = Math.min(...xs)
        const ry = Math.min(...ys)
        const rw = Math.max(...xs) - rx
        const rh = Math.max(...ys) - ry
        svg += `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${obj.color}33" stroke="${obj.color}" stroke-width="1.5"/>`
      }
    } else if (obj.type === 'cone') {
      const d = obj.dimensions as ConeDims
      const halfR = d.radius
      const halfH2 = d.height / 2

      if (view === 'top') {
        const [cx2, cy2] = projectPoint(p.x, p.y, p.z, view)
        const r = halfR * scale
        svg += `<circle cx="${toSvgX(cx2).toFixed(1)}" cy="${toSvgY(cy2).toFixed(1)}" r="${r.toFixed(1)}" fill="${obj.color}33" stroke="${obj.color}" stroke-width="1.5"/>`
      } else {
        // Triangle silhouette
        const [bx1, by1] = projectPoint(p.x - halfR, p.y - halfH2, p.z, view)
        const [bx2, by2] = projectPoint(p.x + halfR, p.y - halfH2, p.z, view)
        const [tx, ty] = projectPoint(p.x, p.y + halfH2, p.z, view)
        const pts = [
          `${toSvgX(bx1).toFixed(1)},${toSvgY(by1).toFixed(1)}`,
          `${toSvgX(bx2).toFixed(1)},${toSvgY(by2).toFixed(1)}`,
          `${toSvgX(tx).toFixed(1)},${toSvgY(ty).toFixed(1)}`,
        ].join(' ')
        svg += `<polygon points="${pts}" fill="${obj.color}33" stroke="${obj.color}" stroke-width="1.5"/>`
      }
    }
  })

  return svg
}

export function exportSVG2D(
  objects: Map<string, SceneObject>,
  view: 'top' | 'front' | 'right' | 'all',
): string {
  const totalW = 1000
  const totalH = 1000

  let svgBody = ''

  if (view === 'all') {
    const vpW = totalW / 2
    const vpH = totalH / 2
    // top-left = front, top-right = right, bottom-left = top
    svgBody += renderView(objects, 'front', vpW, vpH, 0, 0)
    svgBody += renderView(objects, 'right', vpW, vpH, vpW, 0)
    svgBody += renderView(objects, 'top', vpW, vpH, 0, vpH)
    // bottom-right is empty / label
    svgBody += `<rect x="${vpW}" y="${vpH}" width="${vpW}" height="${vpH}" fill="#111827" stroke="#334155"/>`
    svgBody += `<text x="${vpW + vpW / 2}" y="${vpH + vpH / 2}" text-anchor="middle" font-family="monospace" font-size="14" fill="#475569">CrabCAD 2D Export</text>`
  } else {
    svgBody += renderView(objects, view, totalW, totalH, 0, 0)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect width="${totalW}" height="${totalH}" fill="#0f172a"/>
  ${svgBody}
</svg>`
}

export function downloadSVG(
  objects: Map<string, SceneObject>,
  view: 'top' | 'front' | 'right' | 'all',
  filename: string,
): void {
  const content = exportSVG2D(objects, view)
  const blob = new Blob([content], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename + '.svg'
  a.click()
  URL.revokeObjectURL(url)
}
