import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

export class MeasureEngine {
  private scene: THREE.Scene
  private measureLine: THREE.Line | null = null
  private measureLabel: CSS2DObject | null = null
  private protractorLines: THREE.Line[] = []

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  /** Show a measurement line between two points with distance label */
  showMeasure(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
  ): number {
    this.clear()

    const va = new THREE.Vector3(a.x, a.y, a.z)
    const vb = new THREE.Vector3(b.x, b.y, b.z)
    const distance = va.distanceTo(vb)

    // Draw line
    const points = [va, vb]
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineBasicMaterial({ color: 0xfacc15 })
    this.measureLine = new THREE.Line(geo, mat)
    this.measureLine.name = '__measure_line__'
    this.scene.add(this.measureLine)

    // Midpoint label
    const mid = va.clone().lerp(vb, 0.5)
    const el = document.createElement('div')
    el.style.cssText = `
      color: #facc15;
      font-size: 12px;
      background: rgba(0,0,0,0.65);
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
      pointer-events: none;
      font-family: monospace;
    `
    el.textContent = `${distance.toFixed(3)} m`
    this.measureLabel = new CSS2DObject(el)
    this.measureLabel.position.copy(mid)
    this.scene.add(this.measureLabel)

    return distance
  }

  /** Show protractor arc between three points, returns angle in degrees */
  showProtractor(
    center: { x: number; y: number; z: number },
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
  ): number {
    // Clear old protractor lines
    for (const l of this.protractorLines) {
      this.scene.remove(l)
      l.geometry.dispose()
      ;(l.material as THREE.Material).dispose()
    }
    this.protractorLines = []

    const vc = new THREE.Vector3(center.x, center.y, center.z)
    const va = new THREE.Vector3(a.x, a.y, a.z)
    const vb = new THREE.Vector3(b.x, b.y, b.z)

    const dirA = va.clone().sub(vc).normalize()
    const dirB = vb.clone().sub(vc).normalize()
    const cosA = Math.max(-1, Math.min(1, dirA.dot(dirB)))
    const angleDeg = THREE.MathUtils.radToDeg(Math.acos(cosA))

    // Draw two arms
    const mat = new THREE.LineBasicMaterial({ color: 0xfacc15 })

    const armLen = Math.min(va.distanceTo(vc), vb.distanceTo(vc), 1.5)

    for (const dir of [dirA, dirB]) {
      const pts = [vc.clone(), vc.clone().addScaledVector(dir, armLen)]
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const line = new THREE.Line(geo, mat.clone())
      line.name = '__protractor__'
      this.scene.add(line)
      this.protractorLines.push(line)
    }

    // Draw arc
    const arcPoints: THREE.Vector3[] = []
    const startAngle = 0
    const steps = 32
    const axis = new THREE.Vector3().crossVectors(dirA, dirB)
    if (axis.lengthSq() > 1e-8) {
      axis.normalize()
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const rotAngle = THREE.MathUtils.degToRad(angleDeg * t)
        const q = new THREE.Quaternion().setFromAxisAngle(axis, rotAngle)
        const v = dirA.clone().applyQuaternion(q).multiplyScalar(armLen)
        arcPoints.push(vc.clone().add(v))
      }
    }
    void startAngle

    if (arcPoints.length > 1) {
      const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints)
      const arcLine = new THREE.Line(arcGeo, mat.clone())
      arcLine.name = '__protractor__'
      this.scene.add(arcLine)
      this.protractorLines.push(arcLine)
    }

    // Label at arc midpoint
    const labelDir = dirA.clone().lerp(dirB, 0.5).normalize()
    const labelPos = vc.clone().addScaledVector(labelDir, armLen * 1.2)
    const el = document.createElement('div')
    el.style.cssText = `
      color: #facc15;
      font-size: 12px;
      background: rgba(0,0,0,0.65);
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
      pointer-events: none;
      font-family: monospace;
    `
    el.textContent = `${angleDeg.toFixed(1)}°`
    const label = new CSS2DObject(el)
    label.position.copy(labelPos)
    this.scene.add(label)
    this.protractorLines.push(new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial()))
    // Store label as a line for cleanup purposes — use a small trick:
    // We add the CSS2DObject to scene directly; track it via measureLabel slot
    if (this.measureLabel) {
      this.scene.remove(this.measureLabel)
    }
    this.measureLabel = label

    return angleDeg
  }

  /** Clear all measurement visuals */
  clear(): void {
    if (this.measureLine) {
      this.scene.remove(this.measureLine)
      this.measureLine.geometry.dispose()
      ;(this.measureLine.material as THREE.Material).dispose()
      this.measureLine = null
    }
    if (this.measureLabel) {
      this.scene.remove(this.measureLabel)
      this.measureLabel = null
    }
    for (const l of this.protractorLines) {
      this.scene.remove(l)
      l.geometry.dispose()
      ;(l.material as THREE.Material).dispose()
    }
    this.protractorLines = []
  }

  dispose(): void {
    this.clear()
  }
}
