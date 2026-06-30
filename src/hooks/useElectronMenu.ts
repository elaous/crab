import { useEffect } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { useUIStore } from '../store/uiStore'
import { serialize, downloadSTL, downloadCSV, deserialize } from '../lib/io/sceneSerializer'
import { downloadBinary, loadBinaryFromFile } from '../lib/io/capnpSerializer'
import { viewportBus } from '../lib/viewportBus'

export function useElectronMenu() {
  const store = useSceneStore()
  const uiStore = useUIStore()

  useEffect(() => {
    if (!window.electronAPI) return

    const off = window.electronAPI.onMenuAction(async (action) => {
      switch (action) {
        case 'new':
          if (store.isDirty && !confirm('Discard unsaved changes?')) break
          store.newScene()
          break

        case 'open': {
          const data = await loadBinaryFromFile()
          if (!data) break
          const { objects, layers, layerOrder, settings, annotations, assemblies, componentDefs } = deserialize(data)
          store.loadScene(objects, layers, layerOrder, settings, annotations, assemblies, componentDefs)
          store.setSceneName(data.name)
          break
        }

        case 'save': {
          const data = serialize(
            store.sceneName, store.objects, store.layers,
            store.layerOrder, store.settings, store.snapshots, store.annotations, store.assemblies, store.componentDefs,
          )
          await downloadBinary(data, store.sceneName)
          store.setDirty(false)
          break
        }

        case 'saveCheckpoint':
          store.createVersion()
          break

        case 'exportSTL':
          downloadSTL(store.objects, store.sceneName)
          break

        case 'exportGLTF':
          viewportBus.emit({ type: 'exportGLTF', sceneName: store.sceneName })
          break

        case 'exportOBJ':
          viewportBus.emit({ type: 'exportOBJ', sceneName: store.sceneName })
          break

        case 'exportCSV':
          downloadCSV(store.objects, store.sceneName)
          break

        case 'undo': store.undo(); break
        case 'redo': store.redo(); break
        case 'selectAll': store.selectAll(); break
        case 'deselectAll': store.deselectAll(); break
        case 'duplicate':
          if (store.selectedIds.size) store.duplicateObjects(Array.from(store.selectedIds))
          break
        case 'delete':
          if (store.selectedIds.size) store.removeObjects(Array.from(store.selectedIds))
          break
        case 'preferences': uiStore.setPrefsOpen(true); break
        case 'shortcuts': uiStore.setShortcutsOpen(true); break
        case 'onboarding': uiStore.setOnboardingOpen(true); break

        case 'displayShaded':    store.updateSettings({ displayMode: 'shaded' }); break
        case 'displayWireframe': store.updateSettings({ displayMode: 'wireframe' }); break
        case 'displayRendered':  store.updateSettings({ displayMode: 'rendered' }); break

        case 'viewFront': store.setViewPreset('front'); break
        case 'viewRight': store.setViewPreset('right'); break
        case 'viewTop':   store.setViewPreset('top'); break
        case 'viewIso':   store.setViewPreset('iso'); break
      }
    })

    return off
  }, [store, uiStore])
}
