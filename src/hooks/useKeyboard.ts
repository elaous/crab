import { useEffect } from 'react'
import { useSceneStore } from '../store/sceneStore'

export function useKeyboard() {
  const store = useSceneStore()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'z') { e.preventDefault(); store.undo(); return }
      if (ctrl && e.key === 'Z') { e.preventDefault(); store.redo(); return }
      if (ctrl && e.key === 'y') { e.preventDefault(); store.redo(); return }
      if (ctrl && e.key === 'a') { e.preventDefault(); store.selectAll(); return }
      if (ctrl && e.key === 'd') {
        e.preventDefault()
        const ids = Array.from(store.selectedIds)
        if (ids.length) store.duplicateObjects(ids)
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = Array.from(store.selectedIds)
        if (ids.length) { store.removeObjects(ids) }
        return
      }

      if (e.key === 'Escape') { store.deselectAll(); return }

      if (e.key === 'h' || e.key === 'H') {
        store.selectedIds.forEach(id => {
          const obj = store.objects.get(id)
          if (obj) store.updateObject(id, { visible: !obj.visible })
        })
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store])
}
