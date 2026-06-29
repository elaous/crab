import { create } from 'zustand'

interface UIState {
  shortcutsOpen: boolean
  onboardingOpen: boolean
  setShortcutsOpen: (v: boolean) => void
  setOnboardingOpen: (v: boolean) => void
}

const ONBOARDING_KEY = 'crabcad_onboarded'

export const useUIStore = create<UIState>(() => ({
  shortcutsOpen: false,
  onboardingOpen: !localStorage.getItem(ONBOARDING_KEY),
  setShortcutsOpen: (v) => useUIStore.setState({ shortcutsOpen: v }),
  setOnboardingOpen: (v) => {
    if (!v) localStorage.setItem(ONBOARDING_KEY, '1')
    useUIStore.setState({ onboardingOpen: v })
  },
}))
