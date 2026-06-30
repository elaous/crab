import { useState } from 'react'
import { ToolPanel } from '../panels/ToolPanel'
import { PropertiesPanel } from '../panels/PropertiesPanel'
import { MaterialPanel } from '../panels/MaterialPanel'
import { LightingPanel } from '../panels/LightingPanel'
import { ParametricPanel } from '../panels/ParametricPanel'
import { StylesPanel } from '../panels/StylesPanel'

type Tab = 'tools' | 'properties' | 'materials' | 'lighting' | 'params' | 'styles'

const TABS: { id: Tab; label: string }[] = [
  { id: 'tools', label: 'Tools' },
  { id: 'properties', label: 'Props' },
  { id: 'materials', label: 'Mats' },
  { id: 'lighting', label: 'Light' },
  { id: 'params', label: 'Params' },
  { id: 'styles', label: 'Styles' },
]

export function RightSidebar() {
  const [tab, setTab] = useState<Tab>('tools')

  return (
    <div className="flex flex-col w-52 border-l border-slate-800 bg-slate-900 flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors
              ${tab === t.id ? 'text-blue-400 border-b-2 border-blue-400 -mb-px' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'tools' && <ToolPanel />}
        {tab === 'properties' && <PropertiesPanel />}
        {tab === 'materials' && <MaterialPanel />}
        {tab === 'lighting' && <LightingPanel />}
        {tab === 'params' && <ParametricPanel />}
        {tab === 'styles' && <StylesPanel />}
      </div>
    </div>
  )
}
