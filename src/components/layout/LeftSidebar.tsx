import { useState } from 'react'
import { ObjectTree } from '../panels/ObjectTree'
import { LayerPanel } from '../panels/LayerPanel'

type Tab = 'objects' | 'layers'

export function LeftSidebar() {
  const [tab, setTab] = useState<Tab>('objects')

  return (
    <div className="flex flex-col w-52 border-r border-slate-800 bg-slate-900 flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {(['objects', 'layers'] as Tab[]).map(t => (
          <button
            key={t}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors capitalize
              ${tab === t ? 'text-blue-400 border-b-2 border-blue-400 -mb-px' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === 'objects' ? <ObjectTree /> : <LayerPanel />}
      </div>
    </div>
  )
}
