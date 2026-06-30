import { useState } from 'react'
import { useUIStore } from '../../store/uiStore'

const STEPS = [
  {
    icon: '🦀',
    title: 'Welcome to Facet 3D',
    desc: 'A free, browser-based 3D modeling suite inspired by SketchUp. No install needed.',
  },
  {
    icon: '📦',
    title: 'Add Objects',
    desc: 'Use the toolbar on the right to add boxes, spheres, cylinders, and cones to your scene.',
  },
  {
    icon: '🛠',
    title: 'Transform Tools',
    desc: 'Press S (select), M (move), R (rotate), E (scale), or P (push/pull) to switch tools.',
  },
  {
    icon: '🎨',
    title: 'Materials & Lighting',
    desc: 'Open the Mats and Light tabs on the right sidebar to apply PBR materials and control the sun.',
  },
  {
    icon: '💾',
    title: 'Save & Export',
    desc: 'File → Save saves your scene as .facet. Export to GLTF, OBJ, STL, or CSV bill-of-materials.',
  },
]

export function OnboardingOverlay() {
  const { onboardingOpen, setOnboardingOpen } = useUIStore()
  const [step, setStep] = useState(0)

  if (!onboardingOpen) return null

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-96 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6 text-center">
          <div className="text-5xl mb-4">{current.icon}</div>
          <h2 className="text-white font-semibold text-base mb-2">{current.title}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">{current.desc}</p>
        </div>

        {/* Dot nav */}
        <div className="flex justify-center gap-1.5 pb-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-blue-400' : 'bg-slate-700'}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <div className="flex gap-2 px-6 pb-5">
          <button
            className="flex-1 text-xs py-2 text-slate-500 hover:text-slate-300 transition-colors"
            onClick={() => setOnboardingOpen(false)}
          >
            Skip
          </button>
          {step > 0 && (
            <button
              className="px-4 text-xs py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
              onClick={() => setStep(s => s - 1)}
            >
              Back
            </button>
          )}
          <button
            className="flex-1 text-xs py-2 bg-blue-700 hover:bg-blue-600 rounded text-white font-medium transition-colors"
            onClick={() => {
              if (isLast) setOnboardingOpen(false)
              else setStep(s => s + 1)
            }}
          >
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
