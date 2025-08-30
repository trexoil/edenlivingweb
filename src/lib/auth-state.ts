// Global auth state to prevent re-initialization
export const globalAuthState = {
  initialized: false,
  isLoading: true,
  user: null as any,
  currentSite: null as any,
  availableSites: [] as any[]
}

// Simple event emitter for state changes
type Listener = () => void
const listeners: Listener[] = []

export const subscribeToAuthState = (listener: Listener) => {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index > -1) {
      listeners.splice(index, 1)
    }
  }
}

export const notifyAuthStateChange = () => {
  listeners.forEach(listener => listener())
}

export const updateGlobalAuthState = (updates: Partial<typeof globalAuthState>) => {
  Object.assign(globalAuthState, updates)
  notifyAuthStateChange()
}
