import { useState } from 'react'
import { ObjectTree } from '../panels/ObjectTree'
import { LayerPanel } from '../panels/LayerPanel'
import { AnnotationPanel } from '../panels/AnnotationPanel'
import { SnapshotPanel } from '../panels/SnapshotPanel'
import { AssemblyPanel } from '../panels/AssemblyPanel'
import { ComponentPanel } from '../panels/ComponentPanel'

type Tab = 'objects' | 'groups' | 'components' | 'layers' | 'notes' | 'views'

const TABS: { id: Tab; label: string }[] = [
  { id: 'objects', label: 'Objects' },
  { id: 'groups', label: 'Groups' },
  { id: 'components', label: 'Comps' },
  { id: 'layers', label: 'Layers' },
  { id: 'notes', label: 'Notes' },
  { id: 'views', label: 'Views' },
]

export function LeftSidebar() {
  const [tab, setTab] = useState<Tab>('objects')

  return (
    <div className="flex flex-col w-52 border-r border-slate-800 bg-slate-900 flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`flex-shrink-0 px-2 py-1.5 text-xs font-medium transition-colors
              ${tab === t.id ? 'text-blue-400 border-b-2 border-blue-400 -mb-px' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === 'objects' && <ObjectTree />}
        {tab === 'groups' && <AssemblyPanel />}
        {tab === 'components' && <ComponentPanel />}
        {tab === 'layers' && <LayerPanel />}
        {tab === 'notes' && <AnnotationPanel />}
        {tab === 'views' && <SnapshotPanel />}
      </div>
    </div>
  )
}
