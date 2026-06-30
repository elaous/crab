import { create } from 'zustand'

export type ToolMode =
  | 'select' | 'move' | 'rotate' | 'scale' | 'pushpull'
  | 'draw' | 'arc' | 'polygon' | 'eraser' | 'measure' | 'protractor'

interface Vec3Plain { x: number; y: number; z: number }

interface ToolState {
  activeTool: ToolMode
  dimensionDisplay: string | null
  isPushPullDragging: boolean

  measurePoints: Vec3Plain[]
  measureDistance: number | null
  measureAngle: number | null
  protractorPoints: Vec3Plain[]
  inferenceHint: { type: 'x' | 'y' | 'z' | 'none'; point: Vec3Plain } | null
  drawPoints: Vec3Plain[]

  setActiveTool: (tool: ToolMode) => void
  setDimensionDisplay: (s: string | null) => void
  setIsPushPullDragging: (v: boolean) => void
  setMeasurePoints: (pts: Vec3Plain[]) => void
  setMeasureDistance: (d: number | null) => void
  setMeasureAngle: (a: number | null) => void
  setProtractorPoints: (pts: Vec3Plain[]) => void
  setInferenceHint: (hint: { type: 'x' | 'y' | 'z' | 'none'; point: Vec3Plain } | null) => void
  setDrawPoints: (pts: Vec3Plain[]) => void
  clearMeasure: () => void
}

export const useToolStore = create<ToolState>(set => ({
  activeTool: 'select',
  dimensionDisplay: null,
  isPushPullDragging: false,

  measurePoints: [],
  measureDistance: null,
  measureAngle: null,
  protractorPoints: [],
  inferenceHint: null,
  drawPoints: [],

  setActiveTool: (tool) => set({ activeTool: tool }),
  setDimensionDisplay: (s) => set({ dimensionDisplay: s }),
  setIsPushPullDragging: (v) => set({ isPushPullDragging: v }),
  setMeasurePoints: (pts) => set({ measurePoints: pts }),
  setMeasureDistance: (d) => set({ measureDistance: d }),
  setMeasureAngle: (a) => set({ measureAngle: a }),
  setProtractorPoints: (pts) => set({ protractorPoints: pts }),
  setInferenceHint: (hint) => set({ inferenceHint: hint }),
  setDrawPoints: (pts) => set({ drawPoints: pts }),
  clearMeasure: () => set({
    measurePoints: [],
    measureDistance: null,
    measureAngle: null,
    protractorPoints: [],
  }),
}))
