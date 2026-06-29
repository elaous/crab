import { useEffect } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { useToolStore } from '../store/toolStore'
import { useUIStore } from '../store/uiStore'

export function useKeyboard() {
  const store = useSceneStore()
  const toolStore = useToolStore()
  const uiStore = useUIStore()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      // Shortcut help
      if (e.key === '?') { uiStore.setShortcutsOpen(true); return }

      const ctrl = e.ctrlKey || e.metaKey

      // Undo/Redo
      if (ctrl && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (e.shiftKey) store.redo(); else store.undo()
        return
      }
      if (ctrl && e.key === 'y') { e.preventDefault(); store.redo(); return }

      // Selection
      if (ctrl && e.key === 'a') { e.preventDefault(); store.selectAll(); return }
      if (ctrl && e.key === 'd') {
        e.preventDefault()
        const ids = Array.from(store.selectedIds)
        if (ids.length) store.duplicateObjects(ids)
        return
      }
      if (ctrl && e.key === 'g') {
        e.preventDefault()
        const ids = Array.from(store.selectedIds)
        if (ids.length) store.createAssembly(undefined, ids)
        return
      }
      if (e.key === 'Escape') { store.deselectAll(); return }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = Array.from(store.selectedIds)
        if (ids.length) store.removeObjects(ids)
        return
      }

      // Tool modes
      if (!ctrl) {
        switch (e.key.toLowerCase()) {
          case 's': toolStore.setActiveTool('select'); break
          case 'm': toolStore.setActiveTool('move'); break
          case 'r': toolStore.setActiveTool('rotate'); break
          case 'e': toolStore.setActiveTool('scale'); break
          case 'p': toolStore.setActiveTool('pushpull'); break
        }
      }

      // Hide/show
      if (e.key === 'h' || e.key === 'H') {
        store.selectedIds.forEach(id => {
          const obj = store.objects.get(id)
          if (obj) store.updateObject(id, { visible: !obj.visible })
        })
      }

      // Numpad view presets
      if (e.key === '1') store.setViewPreset('front')
      if (e.key === '3') store.setViewPreset('right')
      if (e.key === '7') store.setViewPreset('top')
      if (e.key === '0') store.setViewPreset('iso')
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store, toolStore, uiStore])
}
