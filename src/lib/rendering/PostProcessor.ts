import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { SobelOperatorShader } from 'three/addons/shaders/SobelOperatorShader.js'
import { LuminosityShader } from 'three/addons/shaders/LuminosityShader.js'

export class PostProcessor {
  composer: EffectComposer
  outlinePass: OutlinePass
  lumPass: ShaderPass
  sobelPass: ShaderPass
  outputPass: OutputPass
  renderPass: RenderPass
  width: number
  height: number

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number,
  ) {
    this.width = width
    this.height = height

    this.composer = new EffectComposer(renderer)

    this.renderPass = new RenderPass(scene, camera)
    this.composer.addPass(this.renderPass)

    // Selection outline
    this.outlinePass = new OutlinePass(
      new THREE.Vector2(width, height),
      scene,
      camera,
    )
    this.outlinePass.edgeStrength = 4
    this.outlinePass.edgeGlow = 0.2
    this.outlinePass.edgeThickness = 1
    this.outlinePass.pulsePeriod = 0
    this.outlinePass.visibleEdgeColor.set('#3b82f6')
    this.outlinePass.hiddenEdgeColor.set('#1d4ed8')
    this.composer.addPass(this.outlinePass)

    // Luminosity pass (converts to grayscale for Sobel input)
    this.lumPass = new ShaderPass(LuminosityShader)
    this.lumPass.enabled = false
    this.composer.addPass(this.lumPass)

    // Sobel edge detection
    this.sobelPass = new ShaderPass(SobelOperatorShader)
    this.sobelPass.uniforms['resolution'].value.set(width, height)
    this.sobelPass.enabled = false
    this.composer.addPass(this.sobelPass)

    // Final output with color correction
    this.outputPass = new OutputPass()
    this.composer.addPass(this.outputPass)
  }

  updateCamera(camera: THREE.Camera) {
    this.renderPass.camera = camera
    this.outlinePass.renderCamera = camera
  }

  setSelectedObjects(objects: THREE.Object3D[]) {
    this.outlinePass.selectedObjects = objects
  }

  setSobel(enabled: boolean) {
    this.lumPass.enabled = enabled
    this.sobelPass.enabled = enabled
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.composer.setSize(width, height)
    this.sobelPass.uniforms['resolution'].value.set(width, height)
  }

  render() {
    this.composer.render()
  }
}
