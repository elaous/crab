import { useState } from 'react'
import { ToolPanel } from '../panels/ToolPanel'
import { PropertiesPanel } from '../panels/PropertiesPanel'

type Tab = 'tools' | 'properties'

export function RightSidebar() {
  const [tab, setTab] = useState<Tab>('tools')

  return (
    <div className="flex flex-col w-52 border-l border-slate-800 bg-slate-900 flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {(['tools', 'properties'] as Tab[]).map(t => (
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

      <div className="flex-1 overflow-y-auto">
        {tab === 'tools' ? <ToolPanel /> : <PropertiesPanel />}
      </div>
    </div>
  )
}
