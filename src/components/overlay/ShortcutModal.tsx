import { useEffect } from 'react'
import { useUIStore } from '../../store/uiStore'

const SECTIONS = [
  {
    title: 'Tools',
    shortcuts: [
      { key: 'S', desc: 'Select tool' },
      { key: 'M', desc: 'Move tool' },
      { key: 'R', desc: 'Rotate tool' },
      { key: 'E', desc: 'Scale tool' },
      { key: 'P', desc: 'Push/Pull tool' },
    ],
  },
  {
    title: 'Selection',
    shortcuts: [
      { key: 'Ctrl+A', desc: 'Select all' },
      { key: 'Esc', desc: 'Deselect all' },
      { key: 'Ctrl+D', desc: 'Duplicate selected' },
      { key: 'Del / Backspace', desc: 'Delete selected' },
      { key: 'H', desc: 'Toggle visibility' },
    ],
  },
  {
    title: 'Views',
    shortcuts: [
      { key: '1', desc: 'Front view' },
      { key: '3', desc: 'Right view' },
      { key: '7', desc: 'Top view' },
      { key: '0', desc: 'Isometric view' },
    ],
  },
  {
    title: 'Edit',
    shortcuts: [
      { key: 'Ctrl+Z', desc: 'Undo' },
      { key: 'Ctrl+Shift+Z', desc: 'Redo' },
      { key: 'Ctrl+S', desc: 'Save' },
      { key: 'Ctrl+Shift+S', desc: 'Save version checkpoint' },
      { key: 'Ctrl+N', desc: 'New scene' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'Middle-drag', desc: 'Orbit camera' },
      { key: 'Shift+Middle-drag', desc: 'Pan camera' },
      { key: 'Scroll', desc: 'Zoom' },
      { key: 'Double-click', desc: 'Focus object' },
    ],
  },
  {
    title: 'Help',
    shortcuts: [
      { key: '?', desc: 'Open this shortcut reference' },
      { key: 'Ctrl+,', desc: 'Open Preferences' },
    ],
  },
]

export function ShortcutModal() {
  const { shortcutsOpen, setShortcutsOpen } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShortcutsOpen(false)
    }
    if (shortcutsOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcutsOpen, setShortcutsOpen])

  if (!shortcutsOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setShortcutsOpen(false)}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[640px] max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold text-sm">Keyboard Shortcuts</h2>
          <button
            className="text-slate-400 hover:text-white text-xl leading-none"
            onClick={() => setShortcutsOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 p-5">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.shortcuts.map(s => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">{s.desc}</span>
                    <kbd className="text-xs bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-slate-300 font-mono ml-3 whitespace-nowrap">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
