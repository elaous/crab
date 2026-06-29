import { useEffect } from 'react'
import { MenuBar } from './components/layout/MenuBar'
import { LeftSidebar } from './components/layout/LeftSidebar'
import { RightSidebar } from './components/layout/RightSidebar'
import { StatusBar } from './components/layout/StatusBar'
import { Viewport } from './components/viewport/Viewport'
import { ShortcutModal } from './components/overlay/ShortcutModal'
import { OnboardingOverlay } from './components/overlay/OnboardingOverlay'
import { useKeyboard } from './hooks/useKeyboard'
import { useSceneStore } from './store/sceneStore'
import { loadAutosave, deserialize, autosave, serialize } from './lib/io/sceneSerializer'

export default function App() {
  useKeyboard()
  const store = useSceneStore()

  // Auto-save every 30s
  useEffect(() => {
    const id = setInterval(() => {
      if (store.isDirty) {
        const data = serialize(store.sceneName, store.objects, store.layers, store.layerOrder, store.settings, store.snapshots, store.annotations, store.assemblies, store.componentDefs)
        autosave(data)
      }
    }, 30_000)
    return () => clearInterval(id)
  }, [store])

  // Restore autosave on first load
  useEffect(() => {
    const saved = loadAutosave()
    if (saved) {
      const { objects, layers, layerOrder, settings, annotations, assemblies, componentDefs } = deserialize(saved)
      store.loadScene(objects, layers, layerOrder, settings, annotations, assemblies, componentDefs)
      store.setSceneName(saved.name)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        const data = serialize(store.sceneName, store.objects, store.layers, store.layerOrder, store.settings, store.snapshots, store.annotations, store.assemblies, store.componentDefs)
        autosave(data)
        store.setDirty(false)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        if (store.isDirty && !confirm('Discard unsaved changes?')) return
        store.newScene()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store])

  return (
    <div className="flex flex-col w-full h-full">
      <MenuBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <div className="flex-1 overflow-hidden relative">
          <Viewport />
        </div>
        <RightSidebar />
      </div>
      <StatusBar />
      <ShortcutModal />
      <OnboardingOverlay />
    </div>
  )
}
