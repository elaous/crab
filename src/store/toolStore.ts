import { create } from 'zustand'

export type ToolMode = 'select' | 'move' | 'rotate' | 'scale' | 'pushpull'

interface ToolState {
  activeTool: ToolMode
  dimensionDisplay: string | null
  isPushPullDragging: boolean

  setActiveTool: (tool: ToolMode) => void
  setDimensionDisplay: (s: string | null) => void
  setIsPushPullDragging: (v: boolean) => void
}

export const useToolStore = create<ToolState>(set => ({
  activeTool: 'select',
  dimensionDisplay: null,
  isPushPullDragging: false,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setDimensionDisplay: (s) => set({ dimensionDisplay: s }),
  setIsPushPullDragging: (v) => set({ isPushPullDragging: v }),
}))
