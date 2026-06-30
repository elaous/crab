import * as THREE from 'three'

export class InferenceEngine {
  private lines: THREE.Line[] = []
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  /** Show inference guides from a base point along X (red), Y (green), Z (blue) axes */
  showFromPoint(origin: { x: number; y: number; z: number }): void {
    this.hide()

    const o = new THREE.Vector3(origin.x, origin.y, origin.z)
    const extent = 20

    const axes: Array<{ dir: THREE.Vector3; color: number }> = [
      { dir: new THREE.Vector3(1, 0, 0), color: 0xff4444 },
      { dir: new THREE.Vector3(0, 1, 0), color: 0x44ff44 },
      { dir: new THREE.Vector3(0, 0, 1), color: 0x4444ff },
    ]

    for (const { dir, color } of axes) {
      const points = [
        o.clone().addScaledVector(dir, -extent),
        o.clone().addScaledVector(dir, extent),
      ]
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
      })
      const line = new THREE.Line(geo, mat)
      line.name = '__inference__'
      line.renderOrder = 10
      this.scene.add(line)
      this.lines.push(line)
    }
  }

  /** Hide all guides */
  hide(): void {
    for (const line of this.lines) {
      this.scene.remove(line)
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    }
    this.lines = []
  }

  /** Dispose */
  dispose(): void {
    this.hide()
  }
}
