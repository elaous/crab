import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js'
import { Sky } from 'three/addons/objects/Sky.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import type { SceneObject, ViewMode, ViewPreset, DisplayMode, MousePosition3D, Vec3, BoxDims, Annotation, CameraSnapshot, ComponentDef, ToneMapping, EnvPreset } from '../../types'
import type { ToolMode } from '../../store/toolStore'
import { buildMeshGroup, applyTransform } from '../geometry/primitives'
import { SnapEngine } from '../tools/SnapEngine'
import { PostProcessor } from '../rendering/PostProcessor'

export interface PushPullProgress {
  objectId: string
  distance: number
  snapped: boolean
}

export interface TransformChange {
  id: string
  position: Vec3
  rotation: Vec3
  scale: Vec3
}

export type SceneManagerCallbacks = {
  onSelect: (id: string | null, additive: boolean) => void
  onMouseMove3D: (pos: MousePosition3D) => void
  onContextMenu: (x: number, y: number, id: string | null) => void
  onTransformChange: (change: TransformChange) => void
  onPushPullProgress: (p: PushPullProgress) => void
  onPushPullCommit: () => void
  onBoxSelect: (ids: string[]) => void
}

interface FaceInfo {
  objectId: string
  worldNormal: THREE.Vector3
  axis: 'x' | 'y' | 'z'
  sign: number
  hitPoint: THREE.Vector3
}

interface PushPullState {
  active: boolean
  faceInfo: FaceInfo | null
  startHitPoint: THREE.Vector3
  dragPlane: THREE.Plane
  currentDistance: number
  originalDims: BoxDims
  originalPos: Vec3
}

export class SceneManager {
  canvas: HTMLCanvasElement
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  perspCamera: THREE.PerspectiveCamera
  orthoCamera: THREE.OrthographicCamera
  activeCamera: THREE.Camera
  orbitControls: OrbitControls
  transformControls: TransformControls
  postProcessor: PostProcessor | null = null
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
  snapEngine = new SnapEngine()
  snapEnabled = true
  gridSize = 0.25
  outlineEnabled = true
  labelRenderer: CSS2DRenderer | null = null
  annotationLabels: Map<string, CSS2DObject> = new Map()

  // Push/pull
  private pp: PushPullState = {
    active: false, faceInfo: null,
    startHitPoint: new THREE.Vector3(),
    dragPlane: new THREE.Plane(),
    currentDistance: 0,
    originalDims: { width: 1, height: 1, depth: 1 },
    originalPos: { x: 0, y: 0, z: 0 },
  }
  private faceHighlight: THREE.Mesh | null = null
  private snapIndicator: THREE.Mesh | null = null

  // Environment
  private _envTexture: THREE.Texture | null = null
  private _bgColor = '#16213e'

  // Tool mode
  private toolMode: ToolMode = 'select'

  // Box selection
  private boxSelectStart: { x: number; y: number } | null = null
  private isBoxSelecting = false

  // Transform controls tracking
  private tcAttachedId: string | null = null

  private _destroyed = false

  constructor(canvas: HTMLCanvasElement, callbacks: SceneManagerCallbacks) {
    this.canvas = canvas
    this.callbacks = callbacks

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
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
    this.orthoCamera.zoom = 80
    this.orthoCamera.updateProjectionMatrix()

    this.activeCamera = this.perspCamera

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0x16213e, 80, 300)

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

    this.grid = new THREE.GridHelper(40, 160, 0x2d3748, 0x1e2a3a)
    this.scene.add(this.grid)

    this.axes = new THREE.AxesHelper(3)
    this.scene.add(this.axes)

    const groundGeo = new THREE.PlaneGeometry(40, 40)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat)
    this.groundPlane.rotation.x = -Math.PI / 2
    this.groundPlane.receiveShadow = true
    this.groundPlane.name = '__ground__'
    this.scene.add(this.groundPlane)

    this.orbitControls = new OrbitControls(this.perspCamera, canvas)
    this.orbitControls.enableDamping = true
    this.orbitControls.dampingFactor = 0.08
    this.orbitControls.minDistance = 0.5
    this.orbitControls.maxDistance = 500
    this.orbitControls.screenSpacePanning = false

    // TransformControls for move/rotate/scale
    this.transformControls = new TransformControls(this.perspCamera, canvas)
    this.transformControls.setMode('translate')
    this.transformControls.addEventListener('dragging-changed', (e: { value: unknown }) => {
      this.orbitControls.enabled = !e.value
    })
    this.transformControls.addEventListener('objectChange', () => {
      this.syncTransformToStore()
    })
    this.scene.add(this.transformControls.getHelper())

    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('contextmenu', this.onContextMenu)

    this.resize()

    // Initialize post-processor after renderer and scene are ready
    const pw = canvas.clientWidth || 800
    const ph = canvas.clientHeight || 600
    try {
      this.postProcessor = new PostProcessor(this.renderer, this.scene, this.perspCamera, pw, ph)
    } catch {
      // Post-processing not supported; fall back to basic rendering
      this.postProcessor = null
    }

    // CSS2D label renderer overlaid on canvas
    const container = canvas.parentElement
    if (container) {
      this.labelRenderer = new CSS2DRenderer()
      this.labelRenderer.setSize(container.clientWidth, container.clientHeight)
      this.labelRenderer.domElement.style.position = 'absolute'
      this.labelRenderer.domElement.style.top = '0'
      this.labelRenderer.domElement.style.left = '0'
      this.labelRenderer.domElement.style.pointerEvents = 'none'
      container.appendChild(this.labelRenderer.domElement)
    }

    this.startLoop()
  }

  private syncTransformToStore() {
    const id = this.tcAttachedId
    if (!id) return
    const group = this.objectGroups.get(id)
    if (!group) return
    this.callbacks.onTransformChange({
      id,
      position: { x: group.position.x, y: group.position.y, z: group.position.z },
      rotation: {
        x: THREE.MathUtils.radToDeg(group.rotation.x),
        y: THREE.MathUtils.radToDeg(group.rotation.y),
        z: THREE.MathUtils.radToDeg(group.rotation.z),
      },
      scale: { x: group.scale.x, y: group.scale.y, z: group.scale.z },
    })
  }

  resize() {
    const { canvas, renderer, perspCamera, orthoCamera } = this
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
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
    this.postProcessor?.resize(w, h)
    this.labelRenderer?.setSize(w, h)
  }

  startLoop() {
    const loop = () => {
      if (this._destroyed) return
      this.frameId = requestAnimationFrame(loop)
      this.orbitControls.update()
      if (this.postProcessor) {
        this.postProcessor.render()
      } else {
        this.renderer.render(this.scene, this.activeCamera)
      }
      this.labelRenderer?.render(this.scene, this.activeCamera)
    }
    loop()
  }

  destroy() {
    this._destroyed = true
    cancelAnimationFrame(this.frameId)
    this.orbitControls.dispose()
    this.transformControls.dispose()
    this._envTexture?.dispose()
    this.renderer.dispose()
    this.labelRenderer?.domElement.remove()
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('contextmenu', this.onContextMenu)
  }

  setTool(mode: ToolMode) {
    this.toolMode = mode
    const showTC = mode === 'move' || mode === 'rotate' || mode === 'scale'
    const tcHelper = this.transformControls.getHelper()
    tcHelper.visible = showTC

    if (mode === 'move') this.transformControls.setMode('translate')
    if (mode === 'rotate') this.transformControls.setMode('rotate')
    if (mode === 'scale') this.transformControls.setMode('scale')

    if (mode === 'pushpull') {
      this.canvas.style.cursor = 'cell'
    } else if (mode === 'select') {
      this.canvas.style.cursor = 'crosshair'
    } else {
      this.canvas.style.cursor = 'default'
    }

    this.clearFaceHighlight()
    this.pp.active = false
  }

  syncObjects(
    objects: Map<string, SceneObject>,
    layers: Map<string, { visible: boolean }>,
    selectedIds: Set<string>,
    componentDefs: Map<string, ComponentDef> = new Map(),
  ) {
    this.selectedIds = selectedIds

    const incomingIds = new Set(objects.keys())
    this.objectGroups.forEach((group, id) => {
      if (!incomingIds.has(id)) {
        this.scene.remove(group)
        this.disposeGroup(group)
        this.objectGroups.delete(id)
        if (this.tcAttachedId === id) {
          this.transformControls.detach()
          this.tcAttachedId = null
        }
      }
    })

    objects.forEach((obj, id) => {
      const layer = layers.get(obj.layerId)
      const visible = obj.visible && (layer?.visible ?? true)
      const selected = selectedIds.has(id)

      // For component instances, embed the def's object count in the geoKey so
      // the group is rebuilt whenever the definition changes.
      let geoKey: string
      if (obj.type === 'component-instance' && obj.componentDefId) {
        const def = componentDefs.get(obj.componentDefId)
        geoKey = `component-instance|${obj.componentDefId}|${def?.objects.length ?? 0}`
      } else {
        geoKey = `${obj.type}|${JSON.stringify(obj.dimensions)}`
      }

      if (!this.objectGroups.has(id)) {
        const group = obj.type === 'component-instance'
          ? this.buildInstanceGroup(obj, componentDefs, selected)
          : buildMeshGroup(obj, selected)
        group.userData.geoKey = geoKey
        group.userData.selected = selected
        this.objectGroups.set(id, group)
        this.scene.add(group)
      } else {
        const group = this.objectGroups.get(id)!
        const prevGeoKey = group.userData.geoKey as string
        const wasSelected = group.userData.selected as boolean

        if (prevGeoKey !== geoKey || wasSelected !== selected) {
          if (obj.type === 'component-instance') {
            const old = this.objectGroups.get(id)!
            if (this.tcAttachedId === id) { this.transformControls.detach(); this.tcAttachedId = null }
            this.scene.remove(old)
            this.disposeGroup(old)
            const newGroup = this.buildInstanceGroup(obj, componentDefs, selected)
            newGroup.userData.geoKey = geoKey
            newGroup.userData.selected = selected
            this.objectGroups.set(id, newGroup)
            this.scene.add(newGroup)
          } else {
            this.rebuildGroup(id, obj, selected)
            const rebuilt = this.objectGroups.get(id)!
            rebuilt.userData.geoKey = geoKey
            rebuilt.userData.selected = selected
          }
        } else {
          applyTransform(group, obj)
          group.traverse(child => {
            if (child instanceof THREE.Mesh && child.name.startsWith('mesh_')) {
              const mat = child.material as THREE.MeshStandardMaterial
              mat.color.set(obj.color)
              mat.roughness = obj.roughness ?? 0.7
              mat.metalness = obj.metalness ?? 0.1
              mat.opacity = obj.opacity
              mat.transparent = obj.opacity < 1
              mat.side = obj.opacity < 1 ? THREE.DoubleSide : THREE.FrontSide
            }
          })
        }
      }

      const group = this.objectGroups.get(id)!
      group.visible = visible
      this.applyDisplayMode(group)
    })

    // Manage TransformControls attachment
    const showTC = this.toolMode === 'move' || this.toolMode === 'rotate' || this.toolMode === 'scale'
    if (showTC) {
      const selArr = Array.from(selectedIds)
      if (selArr.length === 1) {
        const group = this.objectGroups.get(selArr[0])
        if (group && this.tcAttachedId !== selArr[0]) {
          this.transformControls.attach(group)
          this.tcAttachedId = selArr[0]
        }
      } else {
        this.transformControls.detach()
        this.tcAttachedId = null
      }
    } else {
      this.transformControls.detach()
      this.tcAttachedId = null
    }

    // Sync outline selection
    this.syncOutlineSelection(selectedIds)
  }

  private buildInstanceGroup(obj: SceneObject, componentDefs: Map<string, ComponentDef>, selected: boolean): THREE.Group {
    const root = new THREE.Group()
    root.name = `instance_${obj.id}`
    applyTransform(root, obj)

    const def = obj.componentDefId ? componentDefs.get(obj.componentDefId) : undefined
    if (def) {
      def.objects.forEach(relObj => {
        const child = buildMeshGroup(relObj, false)
        child.name = `instance_child_${relObj.id}`
        root.add(child)
      })
    } else {
      // Placeholder box when def is missing
      const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
      const mat = new THREE.MeshStandardMaterial({ color: obj.color, wireframe: true })
      root.add(new THREE.Mesh(geo, mat))
    }

    if (selected) {
      const bbox = new THREE.Box3().setFromObject(root)
      const size = new THREE.Vector3(); bbox.getSize(size)
      const center = new THREE.Vector3(); bbox.getCenter(center)
      const box = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z)),
        new THREE.LineBasicMaterial({ color: 0x3b82f6 }),
      )
      box.position.copy(center.sub(root.position))
      box.name = 'sel_instance_box'
      root.add(box)
    }

    return root
  }

  private rebuildGroup(id: string, obj: SceneObject, selected: boolean) {
    const old = this.objectGroups.get(id)!
    if (this.tcAttachedId === id) { this.transformControls.detach(); this.tcAttachedId = null }
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
        mat.wireframe = this.displayMode === 'wireframe'
        if (this.displayMode === 'rendered') {
          mat.envMapIntensity = 1.0
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
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
        else child.material.dispose()
      }
    })
  }

  setViewMode(mode: ViewMode) {
    if (mode === 'perspective') {
      this.activeCamera = this.perspCamera
      this.orbitControls.object = this.perspCamera
      this.transformControls.camera = this.perspCamera
      this.postProcessor?.updateCamera(this.perspCamera)
    } else {
      this.activeCamera = this.orthoCamera
      this.orbitControls.object = this.orthoCamera
      this.transformControls.camera = this.orthoCamera
      this.postProcessor?.updateCamera(this.orthoCamera)
    }
    this.orbitControls.update()
  }

  setViewPreset(preset: ViewPreset) {
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
    this.perspCamera.position.set(x, y, z)
    this.orthoCamera.position.set(x, y, z)
    this.perspCamera.lookAt(0, 0, 0)
    this.orthoCamera.lookAt(0, 0, 0)
    this.orbitControls.target.set(0, 0, 0)
    this.orbitControls.update()
  }

  setDisplayMode(mode: DisplayMode) {
    this.displayMode = mode
    this.objectGroups.forEach(g => this.applyDisplayMode(g))
  }

  setGrid(visible: boolean) { this.grid.visible = visible }
  setAxes(visible: boolean) { this.axes.visible = visible }
  setSnapSettings(enabled: boolean, gridSize: number) {
    this.snapEnabled = enabled
    this.gridSize = gridSize
  }
  setShadows(enabled: boolean) {
    this.renderer.shadowMap.enabled = enabled
    this.sunLight.castShadow = enabled
  }
  setOutline(enabled: boolean) {
    this.outlineEnabled = enabled
    if (this.postProcessor) {
      this.postProcessor.outlinePass.enabled = enabled
    }
  }
  setSobel(enabled: boolean) {
    this.postProcessor?.setSobel(enabled)
  }
  setBloom(enabled: boolean, strength: number, radius: number, threshold: number) {
    this.postProcessor?.setBloom(enabled, strength, radius, threshold)
  }
  setToneMapping(type: ToneMapping, exposure: number) {
    const map: Record<ToneMapping, THREE.ToneMapping> = {
      none: THREE.NoToneMapping,
      linear: THREE.LinearToneMapping,
      reinhard: THREE.ReinhardToneMapping,
      cineon: THREE.CineonToneMapping,
      aces: THREE.ACESFilmicToneMapping,
    }
    this.renderer.toneMapping = map[type]
    this.renderer.toneMappingExposure = exposure
  }
  setEnvironment(preset: EnvPreset, intensity: number) {
    if (this._envTexture) {
      this._envTexture.dispose()
      this._envTexture = null
    }

    const pmrem = new THREE.PMREMGenerator(this.renderer)

    if (preset === 'none') {
      this.scene.environment = null
      this.scene.background = new THREE.Color(this._bgColor)
      pmrem.dispose()
      return
    }

    if (preset === 'studio') {
      pmrem.compileEquirectangularShader()
      const roomEnv = new RoomEnvironment()
      const envMap = pmrem.fromScene(roomEnv).texture
      roomEnv.dispose()
      this._envTexture = envMap
      this.scene.environment = envMap
      this.scene.background = new THREE.Color(this._bgColor)
    } else {
      const sky = new Sky()
      sky.scale.setScalar(450000)
      const skyMat = sky.material as THREE.ShaderMaterial
      const u = skyMat.uniforms
      const configs: Record<'outdoor' | 'sunset' | 'city', { turbidity: number; rayleigh: number; mie: number; mieG: number; elev: number; az: number }> = {
        outdoor: { turbidity: 2, rayleigh: 1, mie: 0.005, mieG: 0.8, elev: 60, az: 180 },
        sunset:  { turbidity: 10, rayleigh: 3, mie: 0.005, mieG: 0.7, elev: 5, az: 220 },
        city:    { turbidity: 10, rayleigh: 2, mie: 0.003, mieG: 0.9, elev: 45, az: 180 },
      }
      const c = configs[preset]
      u['turbidity'].value = c.turbidity
      u['rayleigh'].value = c.rayleigh
      u['mieCoefficient'].value = c.mie
      u['mieDirectionalG'].value = c.mieG
      const sun = new THREE.Vector3()
      sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - c.elev), THREE.MathUtils.degToRad(c.az))
      u['sunPosition'].value.copy(sun)

      const tempScene = new THREE.Scene()
      tempScene.add(sky)
      pmrem.compileCubemapShader()
      const envMap = pmrem.fromScene(tempScene).texture
      this._envTexture = envMap
      this.scene.environment = envMap
      this.scene.background = envMap
    }

    ;(this.scene as unknown as Record<string, unknown>)['environmentIntensity'] = intensity
    pmrem.dispose()
  }
  setBackground(color: string) {
    this._bgColor = color
    this.renderer.setClearColor(new THREE.Color(color))
    const fog = this.scene.fog as THREE.Fog | null
    if (fog) fog.color.set(color)
    if (!(this.scene.background instanceof THREE.Texture)) {
      this.scene.background = new THREE.Color(color)
    }
  }
  setSunDirection(azimuthDeg: number, elevationDeg: number, intensity: number) {
    const az = THREE.MathUtils.degToRad(azimuthDeg)
    const el = THREE.MathUtils.degToRad(elevationDeg)
    const x = Math.cos(el) * Math.sin(az)
    const y = Math.sin(el)
    const z = Math.cos(el) * Math.cos(az)
    this.sunLight.position.set(x * 15, y * 15, z * 15)
    this.sunLight.intensity = intensity
  }
  syncOutlineSelection(selectedIds: Set<string>) {
    if (!this.postProcessor) return
    const selected: THREE.Object3D[] = []
    selectedIds.forEach(id => {
      const group = this.objectGroups.get(id)
      if (group) {
        group.traverse(child => {
          if (child instanceof THREE.Mesh && child.name.startsWith('mesh_')) {
            selected.push(child)
          }
        })
      }
    })
    this.postProcessor.setSelectedObjects(selected)
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
    const dist = maxDim * 2 + 3
    this.perspCamera.position.set(center.x + dist, center.y + dist * 0.5, center.z + dist)
    this.perspCamera.lookAt(center)
    this.orbitControls.target.copy(center)
    this.orbitControls.update()
  }

  // ─── Push/Pull helpers ────────────────────────────────────────────

  createFaceHighlight(faceInfo: FaceInfo, obj: SceneObject) {
    this.clearFaceHighlight()
    if (obj.type !== 'box') return

    const dims = obj.dimensions as BoxDims
    const { axis, sign, worldNormal } = faceInfo

    let w = 1, h = 1
    if (axis === 'y') { w = dims.width; h = dims.depth }
    else if (axis === 'x') { w = dims.depth; h = dims.height }
    else { w = dims.width; h = dims.height }

    const geo = new THREE.PlaneGeometry(w, h)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthTest: true,
    })
    this.faceHighlight = new THREE.Mesh(geo, mat)

    // Position at face center
    const faceCenter = new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z)
    if (axis === 'y') faceCenter.y += sign * dims.height / 2
    else if (axis === 'x') faceCenter.x += sign * dims.width / 2
    else faceCenter.z += sign * dims.depth / 2

    this.faceHighlight.position.copy(faceCenter)
    this.faceHighlight.position.addScaledVector(worldNormal, 0.002)

    // Align to face normal
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      worldNormal,
    )
    this.faceHighlight.setRotationFromQuaternion(quaternion)
    this.faceHighlight.renderOrder = 2

    this.scene.add(this.faceHighlight)
  }

  private clearFaceHighlight() {
    if (this.faceHighlight) {
      this.scene.remove(this.faceHighlight)
      this.faceHighlight.geometry.dispose()
      ;(this.faceHighlight.material as THREE.Material).dispose()
      this.faceHighlight = null
    }
  }

  private showSnapIndicator(point: THREE.Vector3, type: string) {
    if (!this.snapIndicator) {
      const geo = new THREE.SphereGeometry(0.06, 8, 8)
      const mat = new THREE.MeshBasicMaterial({
        color: type === 'vertex' ? 0x22c55e : type === 'midpoint' ? 0xfbbf24 : 0x60a5fa,
      })
      this.snapIndicator = new THREE.Mesh(geo, mat)
      this.scene.add(this.snapIndicator)
    }
    this.snapIndicator.position.copy(point)
    this.snapIndicator.visible = true
  }

  private hideSnapIndicator() {
    if (this.snapIndicator) this.snapIndicator.visible = false
  }

  // ─── Mesh queries ──────────────────────────────────────────────────

  private getMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = []
    this.objectGroups.forEach(group => {
      group.traverse(child => {
        if (child instanceof THREE.Mesh && child.name.startsWith('mesh_')) meshes.push(child)
      })
    })
    return meshes
  }

  private getPointerNDC(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  private getFaceInfo(hit: THREE.Intersection): FaceInfo | null {
    if (!hit.face) return null
    const mesh = hit.object as THREE.Mesh
    const id = mesh.userData.objectId as string
    if (!id) return null

    const worldNormal = hit.face.normal.clone()
      .applyMatrix3(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld))
      .normalize()

    const ax = Math.abs(worldNormal.x)
    const ay = Math.abs(worldNormal.y)
    const az = Math.abs(worldNormal.z)
    const max = Math.max(ax, ay, az)
    const axis = max === ax ? 'x' : max === ay ? 'y' : 'z'
    const sign = worldNormal[axis] > 0 ? 1 : -1

    return { objectId: id, worldNormal, axis, sign, hitPoint: hit.point.clone() }
  }

  // ─── Event handlers ────────────────────────────────────────────────

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    this.getPointerNDC(e)
    this.raycaster.setFromCamera(this.pointer, this.activeCamera)

    if (this.toolMode === 'pushpull') {
      const hits = this.raycaster.intersectObjects(this.getMeshes(), false)
      if (hits.length > 0) {
        const faceInfo = this.getFaceInfo(hits[0])
        if (!faceInfo) return

        // Find the SceneObject for this hit
        const group = this.objectGroups.get(faceInfo.objectId)
        if (!group) return

        // We'll rely on the store; just store faceInfo and let the viewport
        // call beginPushPull with the actual object data
        this.pp.faceInfo = faceInfo
        this.pp.startHitPoint = faceInfo.hitPoint.clone()
        this.pp.currentDistance = 0

        // Build drag plane: normal = cross(faceNormal, cross(cameraDir, faceNormal))
        const camDir = this.activeCamera.getWorldDirection(new THREE.Vector3())
        const cross1 = new THREE.Vector3().crossVectors(camDir, faceInfo.worldNormal)
        const planeNormal = new THREE.Vector3().crossVectors(faceInfo.worldNormal, cross1).normalize()
        if (planeNormal.lengthSq() < 0.0001) {
          planeNormal.copy(camDir)
        }
        this.pp.dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, faceInfo.hitPoint)

        this.canvas.setPointerCapture(e.pointerId)
        this.orbitControls.enabled = false

        // Signal push/pull started
        this.callbacks.onSelect(faceInfo.objectId, false)
        return
      }
      return
    }

    // Box selection tracking
    if (this.toolMode === 'select') {
      const hits = this.raycaster.intersectObjects(this.getMeshes(), false)
      if (hits.length === 0) {
        const rect = this.canvas.getBoundingClientRect()
        this.boxSelectStart = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        this.isBoxSelecting = false
        this.canvas.setPointerCapture(e.pointerId)
        return
      }
    }

    // Normal select
    const hits = this.raycaster.intersectObjects(this.getMeshes(), false)
    const additive = e.ctrlKey || e.metaKey || e.shiftKey
    if (hits.length > 0) {
      this.callbacks.onSelect(hits[0].object.userData.objectId as string, additive)
    } else if (!additive) {
      this.callbacks.onSelect(null, false)
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    this.getPointerNDC(e)
    this.raycaster.setFromCamera(this.pointer, this.activeCamera)

    // Ground plane 3D position
    const groundHits = this.raycaster.intersectObject(this.groundPlane, false)
    if (groundHits.length > 0) {
      const pt = groundHits[0].point
      this.callbacks.onMouseMove3D({ x: pt.x, y: pt.y, z: pt.z, valid: true })
    } else {
      this.callbacks.onMouseMove3D({ x: 0, y: 0, z: 0, valid: false })
    }

    // Push/pull drag
    if (this.toolMode === 'pushpull' && this.pp.faceInfo && e.buttons === 1) {
      const newPt = new THREE.Vector3()
      this.raycaster.ray.intersectPlane(this.pp.dragPlane, newPt)
      if (newPt.lengthSq() === 0) return

      const rawDist = newPt.sub(this.pp.startHitPoint).dot(this.pp.faceInfo.worldNormal)
      const snapped = this.snapEngine.snapDistance(rawDist, this.gridSize, this.snapEnabled)

      this.pp.currentDistance = snapped

      if (Math.abs(snapped) > 0.001) {
        this.callbacks.onPushPullProgress({
          objectId: this.pp.faceInfo.objectId,
          distance: snapped,
          snapped: this.snapEnabled,
        })
      }

      // Show snap indicator at the extrusion endpoint
      const indicator = this.pp.startHitPoint.clone().addScaledVector(
        this.pp.faceInfo.worldNormal,
        snapped,
      )
      this.showSnapIndicator(indicator, 'vertex')
      return
    }

    // Face hover highlight in push/pull mode
    if (this.toolMode === 'pushpull' && e.buttons === 0) {
      const hits = this.raycaster.intersectObjects(this.getMeshes(), false)
      if (hits.length > 0 && hits[0].face) {
        // lightweight highlight - just show indicator at hit
        this.showSnapIndicator(hits[0].point, 'vertex')
      } else {
        this.hideSnapIndicator()
      }
    } else if (this.toolMode !== 'pushpull') {
      this.hideSnapIndicator()
    }

    // Box selection drag
    if (this.toolMode === 'select' && this.boxSelectStart && e.buttons === 1) {
      const rect = this.canvas.getBoundingClientRect()
      const cur = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const dx = cur.x - this.boxSelectStart.x
      const dy = cur.y - this.boxSelectStart.y
      if (Math.hypot(dx, dy) > 4) {
        this.isBoxSelecting = true
        // Notify viewport for overlay rendering via a custom event
        this.canvas.dispatchEvent(new CustomEvent('boxselect', {
          detail: { start: this.boxSelectStart, end: cur },
          bubbles: false,
        }))
      }
    }
  }

  private onPointerUp = (e: PointerEvent) => {
    // Commit push/pull
    if (this.toolMode === 'pushpull' && this.pp.faceInfo) {
      this.orbitControls.enabled = true
      this.clearFaceHighlight()
      this.hideSnapIndicator()
      if (Math.abs(this.pp.currentDistance) > 0.001) {
        this.callbacks.onPushPullCommit()
      }
      this.pp.faceInfo = null
      this.pp.active = false
      this.canvas.releasePointerCapture(e.pointerId)
      return
    }

    // Finish box selection
    if (this.toolMode === 'select' && this.isBoxSelecting && this.boxSelectStart) {
      const rect = this.canvas.getBoundingClientRect()
      const end = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      this.commitBoxSelect(this.boxSelectStart, end, rect)
      this.boxSelectStart = null
      this.isBoxSelecting = false
      this.canvas.dispatchEvent(new CustomEvent('boxselectend', { bubbles: false }))
      this.canvas.releasePointerCapture(e.pointerId)
      return
    }

    this.boxSelectStart = null
    this.isBoxSelecting = false
  }

  private commitBoxSelect(
    start: { x: number; y: number },
    end: { x: number; y: number },
    canvasRect: DOMRect,
  ) {
    const minX = Math.min(start.x, end.x) / canvasRect.width
    const maxX = Math.max(start.x, end.x) / canvasRect.width
    const minY = Math.min(start.y, end.y) / canvasRect.height
    const maxY = Math.max(start.y, end.y) / canvasRect.height

    const selected: string[] = []
    this.objectGroups.forEach((group, id) => {
      if (!group.visible) return
      const box = new THREE.Box3().setFromObject(group)
      const center = new THREE.Vector3()
      box.getCenter(center)
      const ndc = center.clone().project(this.activeCamera)
      const sx = (ndc.x * 0.5 + 0.5)
      const sy = (-ndc.y * 0.5 + 0.5)
      if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
        selected.push(id)
      }
    })
    this.callbacks.onBoxSelect(selected)
  }

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.activeCamera)
    const hits = this.raycaster.intersectObjects(this.getMeshes(), false)
    const id = hits.length > 0 ? (hits[0].object.userData.objectId as string) : null
    this.callbacks.onContextMenu(e.clientX, e.clientY, id)
  }

  /** Store object data on group for push/pull access */
  storeObjectOnGroup(id: string, obj: SceneObject) {
    const group = this.objectGroups.get(id)
    if (group) group.userData.sceneObject = obj
  }

  /** Begin push/pull with object data */
  beginPushPull(obj: SceneObject) {
    if (!this.pp.faceInfo || this.pp.faceInfo.objectId !== obj.id) return
    this.pp.originalDims = { ...(obj.dimensions as BoxDims) }
    this.pp.originalPos = { ...obj.position }
    this.pp.active = true
  }

  /** Apply current push/pull distance and return updated dims + position */
  applyPushPull(obj: SceneObject, distance: number): { dims: BoxDims; pos: Vec3 } | null {
    if (!this.pp.faceInfo) return null
    const { axis, sign } = this.pp.faceInfo
    const dims = { ...(obj.dimensions as BoxDims) }
    const pos = { ...obj.position }
    const halfDelta = distance / 2

    if (axis === 'y') { dims.height = Math.max(0.01, dims.height + distance * sign); pos.y += halfDelta * sign }
    else if (axis === 'x') { dims.width = Math.max(0.01, dims.width + distance * sign); pos.x += halfDelta * sign }
    else { dims.depth = Math.max(0.01, dims.depth + distance * sign); pos.z += halfDelta * sign }

    return { dims, pos }
  }

  // ─── Section cut ───────────────────────────────────────────────────

  setSectionCut(enabled: boolean, axis: 'x' | 'y' | 'z', offset: number) {
    if (enabled) {
      const normal = axis === 'x' ? new THREE.Vector3(-1, 0, 0) :
                     axis === 'y' ? new THREE.Vector3(0, -1, 0) :
                                    new THREE.Vector3(0, 0, -1)
      this.renderer.clippingPlanes = [new THREE.Plane(normal, offset)]
    } else {
      this.renderer.clippingPlanes = []
    }
  }

  // ─── Camera state ──────────────────────────────────────────────────

  getCameraState(): Omit<CameraSnapshot, 'id' | 'name'> {
    const cam = this.perspCamera
    const t = this.orbitControls.target
    return {
      preset: 'iso',
      mode: (this.activeCamera === this.perspCamera ? 'perspective' : 'orthographic') as import('../../types').ViewMode,
      position: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
      target: { x: t.x, y: t.y, z: t.z },
      fov: cam.fov,
      zoom: this.orthoCamera.zoom,
    }
  }

  restoreSnapshot(snap: CameraSnapshot) {
    this.perspCamera.position.set(snap.position.x, snap.position.y, snap.position.z)
    this.orthoCamera.position.set(snap.position.x, snap.position.y, snap.position.z)
    this.orbitControls.target.set(snap.target.x, snap.target.y, snap.target.z)
    if (snap.fov) {
      this.perspCamera.fov = snap.fov
      this.perspCamera.updateProjectionMatrix()
    }
    this.orbitControls.update()
  }

  captureImage(): string {
    if (this.postProcessor) this.postProcessor.render()
    else this.renderer.render(this.scene, this.activeCamera)
    return this.renderer.domElement.toDataURL('image/png')
  }

  // ─── Annotations ──────────────────────────────────────────────────

  syncAnnotations(annotations: Map<string, Annotation>) {
    // Remove stale labels
    this.annotationLabels.forEach((label, id) => {
      if (!annotations.has(id)) {
        this.scene.remove(label)
        this.annotationLabels.delete(id)
      }
    })
    // Add / update
    annotations.forEach((ann, id) => {
      if (!this.annotationLabels.has(id)) {
        const el = document.createElement('div')
        el.style.cssText = `
          color: ${ann.color};
          font-size: ${ann.fontSize}px;
          background: rgba(0,0,0,0.55);
          padding: 2px 6px;
          border-radius: 3px;
          white-space: nowrap;
          pointer-events: none;
          font-family: monospace;
        `
        el.textContent = ann.text
        const label = new CSS2DObject(el)
        label.position.set(ann.position.x, ann.position.y, ann.position.z)
        this.scene.add(label)
        this.annotationLabels.set(id, label)
      } else {
        const label = this.annotationLabels.get(id)!
        label.position.set(ann.position.x, ann.position.y, ann.position.z)
        const el = label.element as HTMLElement
        el.textContent = ann.text
        el.style.color = ann.color
        el.style.fontSize = `${ann.fontSize}px`
      }
    })
  }

  // ─── 3D exports ────────────────────────────────────────────────────

  exportGLTF(sceneName: string) {
    const group = new THREE.Group()
    this.objectGroups.forEach(g => group.add(g.clone(true)))
    const exporter = new GLTFExporter()
    exporter.parse(group, (result) => {
      const output = result instanceof ArrayBuffer
        ? new Blob([result], { type: 'model/gltf-binary' })
        : new Blob([JSON.stringify(result)], { type: 'model/gltf+json' })
      const suffix = result instanceof ArrayBuffer ? '.glb' : '.gltf'
      const url = URL.createObjectURL(output)
      const a = document.createElement('a')
      a.href = url; a.download = sceneName + suffix; a.click()
      URL.revokeObjectURL(url)
    }, console.error)
  }

  exportOBJ(sceneName: string) {
    const group = new THREE.Group()
    this.objectGroups.forEach(g => group.add(g.clone(true)))
    const exporter = new OBJExporter()
    const result = exporter.parse(group)
    const blob = new Blob([result], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = sceneName + '.obj'; a.click()
    URL.revokeObjectURL(url)
  }
}
