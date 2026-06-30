import { create } from 'zustand'

interface UIState {
  shortcutsOpen: boolean
  onboardingOpen: boolean
  prefsOpen: boolean
  setShortcutsOpen: (v: boolean) => void
  setOnboardingOpen: (v: boolean) => void
  setPrefsOpen: (v: boolean) => void
}

const ONBOARDING_KEY = 'crabcad_onboarded'

export const useUIStore = create<UIState>(() => ({
  shortcutsOpen: false,
  onboardingOpen: !localStorage.getItem(ONBOARDING_KEY),
  prefsOpen: false,
  setShortcutsOpen: (v) => useUIStore.setState({ shortcutsOpen: v }),
  setOnboardingOpen: (v) => {
    if (!v) localStorage.setItem(ONBOARDING_KEY, '1')
    useUIStore.setState({ onboardingOpen: v })
  },
  setPrefsOpen: (v) => useUIStore.setState({ prefsOpen: v }),
}))
