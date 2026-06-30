import * as THREE from 'three'

export class DrawEngine {
  private scene: THREE.Scene
  private previewLine: THREE.Line | null = null
  private placedPoints: THREE.Vector3[] = []
  private pointMarkers: THREE.Mesh[] = []

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  /** Add a point to the current path */
  addPoint(pt: THREE.Vector3): void {
    this.placedPoints.push(pt.clone())

    // Add a small sphere marker
    const geo = new THREE.SphereGeometry(0.04, 8, 8)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const marker = new THREE.Mesh(geo, mat)
    marker.position.copy(pt)
    marker.name = '__draw_marker__'
    this.scene.add(marker)
    this.pointMarkers.push(marker)
  }

  /** Update the preview line to show where next segment will go */
  updatePreview(current: THREE.Vector3): void {
    if (this.placedPoints.length === 0) return

    const lastPt = this.placedPoints[this.placedPoints.length - 1]
    const points = [lastPt.clone(), current.clone()]

    if (this.previewLine) {
      this.scene.remove(this.previewLine)
      this.previewLine.geometry.dispose()
      ;(this.previewLine.material as THREE.Material).dispose()
      this.previewLine = null
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineDashedMaterial({
      color: 0x60a5fa,
      dashSize: 0.1,
      gapSize: 0.05,
    })
    this.previewLine = new THREE.Line(geo, mat)
    this.previewLine.computeLineDistances()
    this.previewLine.name = '__draw_preview__'
    this.scene.add(this.previewLine)
  }

  /** Get the current placed points */
  getPoints(): THREE.Vector3[] {
    return [...this.placedPoints]
  }

  /**
   * Commit the current drawn path as a series of line segment pairs.
   * Returns array of [start, end] pairs as plain Vec3 objects.
   */
  commit(): { x: number; y: number; z: number }[][] {
    const segments: { x: number; y: number; z: number }[][] = []
    for (let i = 0; i < this.placedPoints.length - 1; i++) {
      const a = this.placedPoints[i]
      const b = this.placedPoints[i + 1]
      segments.push([
        { x: a.x, y: a.y, z: a.z },
        { x: b.x, y: b.y, z: b.z },
      ])
    }
    this.cancel()
    return segments
  }

  /** Cancel / clear */
  cancel(): void {
    if (this.previewLine) {
      this.scene.remove(this.previewLine)
      this.previewLine.geometry.dispose()
      ;(this.previewLine.material as THREE.Material).dispose()
      this.previewLine = null
    }
    for (const marker of this.pointMarkers) {
      this.scene.remove(marker)
      marker.geometry.dispose()
      ;(marker.material as THREE.Material).dispose()
    }
    this.pointMarkers = []
    this.placedPoints = []
  }

  dispose(): void {
    this.cancel()
  }
}
