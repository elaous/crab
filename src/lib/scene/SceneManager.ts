import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { SceneObject, ViewMode, ViewPreset, DisplayMode, MousePosition3D } from '../../types'
import { buildMeshGroup, applyTransform } from '../geometry/primitives'

export type SceneManagerCallbacks = {
  onSelect: (id: string | null, additive: boolean) => void
  onMouseMove3D: (pos: MousePosition3D) => void
  onContextMenu: (x: number, y: number, id: string | null) => void
}

export class SceneManager {
  canvas: HTMLCanvasElement
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  perspCamera: THREE.PerspectiveCamera
  orthoCamera: THREE.OrthographicCamera
  activeCamera: THREE.Camera
  controls: OrbitControls
  objectGroups: Map<string, THREE.Group> = new Map()
  raycaster = new THREE.Raycaster()
  pointer = new THREE.Vector2()
  grid: THREE.GridHelper
  axes: THREE.AxesHelper
  groundPlane: THREE.Mesh
  frameId = 0
  displayMode: DisplayMode = 'shaded'
  callbacks: SceneManagerCallbacks
  selectedIds: Set<string> = new Set()
  ambientLight: THREE.AmbientLight
  sunLight: THREE.DirectionalLight
  private _destroyed = false

  constructor(canvas: HTMLCanvasElement, callbacks: SceneManagerCallbacks) {
    this.canvas = canvas
    this.callbacks = callbacks

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.setClearColor(0x16213e)

    const w = canvas.clientWidth || 800
    const h = canvas.clientHeight || 600

    this.perspCamera = new THREE.PerspectiveCamera(45, w / h, 0.01, 10000)
    this.perspCamera.position.set(5, 4, 6)
    this.perspCamera.lookAt(0, 0, 0)

    this.orthoCamera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.01, 10000)
    this.orthoCamera.position.set(5, 4, 6)
    this.orthoCamera.lookAt(0, 0, 0)

    this.activeCamera = this.perspCamera

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0x16213e, 50, 200)

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(this.ambientLight)

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2)
    this.sunLight.position.set(8, 12, 6)
    this.sunLight.castShadow = true
    this.sunLight.shadow.camera.near = 0.1
    this.sunLight.shadow.camera.far = 100
    this.sunLight.shadow.camera.left = -20
    this.sunLight.shadow.camera.right = 20
    this.sunLight.shadow.camera.top = 20
    this.sunLight.shadow.camera.bottom = -20
    this.sunLight.shadow.mapSize.set(2048, 2048)
    this.scene.add(this.sunLight)

    const fillLight = new THREE.DirectionalLight(0x8eb8ff, 0.4)
    fillLight.position.set(-5, 3, -8)
    this.scene.add(fillLight)

    this.grid = new THREE.GridHelper(40, 40, 0x2d3748, 0x1e2a3a)
    this.scene.add(this.grid)

    this.axes = new THREE.AxesHelper(3)
    this.scene.add(this.axes)

    const groundGeo = new THREE.PlaneGeometry(40, 40)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0,
    })
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat)
    this.groundPlane.rotation.x = -Math.PI / 2
    this.groundPlane.receiveShadow = true
    this.groundPlane.name = '__ground__'
    this.scene.add(this.groundPlane)

    this.controls = new OrbitControls(this.perspCamera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 0.5
    this.controls.maxDistance = 500
    this.controls.screenSpacePanning = false

    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('contextmenu', this.onContextMenu)

    this.resize()
    this.startLoop()
  }

  resize() {
    const { canvas, renderer, perspCamera, orthoCamera } = this
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    renderer.setSize(w, h, false)
    perspCamera.aspect = w / h
    perspCamera.updateProjectionMatrix()
    const aspect = w / h
    const s = 10
    orthoCamera.left = -s * aspect
    orthoCamera.right = s * aspect
    orthoCamera.top = s
    orthoCamera.bottom = -s
    orthoCamera.updateProjectionMatrix()
  }

  startLoop() {
    const loop = () => {
      if (this._destroyed) return
      this.frameId = requestAnimationFrame(loop)
      this.controls.update()
      this.renderer.render(this.scene, this.activeCamera)
    }
    loop()
  }

  destroy() {
    this._destroyed = true
    cancelAnimationFrame(this.frameId)
    this.controls.dispose()
    this.renderer.dispose()
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('contextmenu', this.onContextMenu)
  }

  syncObjects(objects: Map<string, SceneObject>, layers: Map<string, Layer_>, selectedIds: Set<string>) {
    this.selectedIds = selectedIds

    const currentIds = new Set(this.objectGroups.keys())
    const incomingIds = new Set(objects.keys())

    currentIds.forEach(id => {
      if (!incomingIds.has(id)) {
        const group = this.objectGroups.get(id)!
        this.scene.remove(group)
        this.disposeGroup(group)
        this.objectGroups.delete(id)
      }
    })

    objects.forEach((obj, id) => {
      const layer = layers.get(obj.layerId)
      const visible = obj.visible && (layer?.visible ?? true)
      const selected = selectedIds.has(id)

      if (!this.objectGroups.has(id)) {
        const group = buildMeshGroup(obj, selected)
        this.objectGroups.set(id, group)
        this.scene.add(group)
      } else {
        const group = this.objectGroups.get(id)!
        const wasSelected = group.children.some(c => c.name.startsWith('sel_'))
        if (wasSelected !== selected) {
          this.rebuildGroup(id, obj, selected)
        } else {
          applyTransform(group, obj)
          group.traverse(child => {
            if (child instanceof THREE.Mesh && child.name.startsWith('mesh_')) {
              ;(child.material as THREE.MeshStandardMaterial).color.set(obj.color)
              ;(child.material as THREE.MeshStandardMaterial).opacity = obj.opacity
            }
          })
        }
      }

      const group = this.objectGroups.get(id)!
      group.visible = visible
      this.applyDisplayMode(group)
    })
  }

  private rebuildGroup(id: string, obj: SceneObject, selected: boolean) {
    const old = this.objectGroups.get(id)!
    this.scene.remove(old)
    this.disposeGroup(old)
    const group = buildMeshGroup(obj, selected)
    this.scene.add(group)
    this.objectGroups.set(id, group)
  }

  private applyDisplayMode(group: THREE.Group) {
    group.traverse(child => {
      if (child instanceof THREE.Mesh && child.name.startsWith('mesh_')) {
        const mat = child.material as THREE.MeshStandardMaterial
        switch (this.displayMode) {
          case 'wireframe':
            mat.wireframe = true
            mat.transparent = false
            mat.opacity = 1
            break
          case 'shaded':
            mat.wireframe = false
            break
          case 'rendered':
            mat.wireframe = false
            break
        }
      }
      if (child instanceof THREE.LineSegments && child.name.startsWith('edges_')) {
        child.visible = this.displayMode !== 'wireframe'
      }
    })
  }

  private disposeGroup(group: THREE.Group) {
    group.traverse(child => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
  }

  setViewMode(mode: ViewMode) {
    if (mode === 'perspective') {
      this.activeCamera = this.perspCamera
      this.controls.object = this.perspCamera
    } else {
      this.activeCamera = this.orthoCamera
      this.controls.object = this.orthoCamera
    }
    this.controls.update()
  }

  setViewPreset(preset: ViewPreset) {
    const cam = this.perspCamera
    const dist = 10
    const targets: Record<ViewPreset, [number, number, number]> = {
      front:  [0, 0, dist],
      back:   [0, 0, -dist],
      left:   [-dist, 0, 0],
      right:  [dist, 0, 0],
      top:    [0, dist, 0.001],
      bottom: [0, -dist, 0.001],
      iso:    [dist * 0.6, dist * 0.6, dist * 0.6],
    }
    const [x, y, z] = targets[preset]
    cam.position.set(x, y, z)
    this.orthoCamera.position.set(x, y, z)
    cam.lookAt(0, 0, 0)
    this.orthoCamera.lookAt(0, 0, 0)
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

  setDisplayMode(mode: DisplayMode) {
    this.displayMode = mode
    this.objectGroups.forEach(group => this.applyDisplayMode(group))
  }

  setGrid(visible: boolean) { this.grid.visible = visible }
  setAxes(visible: boolean) { this.axes.visible = visible }
  setShadows(enabled: boolean) {
    this.renderer.shadowMap.enabled = enabled
    this.sunLight.castShadow = enabled
  }

  frameAll() {
    if (this.objectGroups.size === 0) return
    const box = new THREE.Box3()
    this.objectGroups.forEach(g => box.expandByObject(g))
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(center)
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const dist = maxDim * 2
    this.perspCamera.position.set(center.x + dist, center.y + dist * 0.5, center.z + dist)
    this.perspCamera.lookAt(center)
    this.controls.target.copy(center)
    this.controls.update()
  }

  private getPointerNDC(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  private getMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = []
    this.objectGroups.forEach(group => {
      group.traverse(child => {
        if (child instanceof THREE.Mesh && child.name.startsWith('mesh_')) meshes.push(child)
      })
    })
    return meshes
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    this.getPointerNDC(e)
    this.raycaster.setFromCamera(this.pointer, this.activeCamera)
    const hits = this.raycaster.intersectObjects(this.getMeshes(), false)
    const additive = e.ctrlKey || e.metaKey || e.shiftKey
    if (hits.length > 0) {
      const mesh = hits[0].object
      const objectId = mesh.userData.objectId as string
      this.callbacks.onSelect(objectId, additive)
    } else {
      if (!additive) this.callbacks.onSelect(null, false)
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    this.getPointerNDC(e)
    this.raycaster.setFromCamera(this.pointer, this.activeCamera)
    const hits = this.raycaster.intersectObject(this.groundPlane, false)
    if (hits.length > 0) {
      const pt = hits[0].point
      this.callbacks.onMouseMove3D({ x: pt.x, y: pt.y, z: pt.z, valid: true })
    } else {
      this.callbacks.onMouseMove3D({ x: 0, y: 0, z: 0, valid: false })
    }
  }

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    this.pointer.x = ((e.clientX - this.canvas.getBoundingClientRect().left) / this.canvas.clientWidth) * 2 - 1
    this.pointer.y = -((e.clientY - this.canvas.getBoundingClientRect().top) / this.canvas.clientHeight) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.activeCamera)
    const hits = this.raycaster.intersectObjects(this.getMeshes(), false)
    const id = hits.length > 0 ? (hits[0].object.userData.objectId as string) : null
    this.callbacks.onContextMenu(e.clientX, e.clientY, id)
  }
}

type Layer_ = { visible: boolean }
