/**
 * Lightweight state management using signals
 */

class Signal {
  constructor(initialValue) {
    this.value = initialValue;
    this.subscribers = new Set();
  }
  
  get() {
    return this.value;
  }
  
  set(newValue) {
    if (this.value !== newValue) {
      this.value = newValue;
      this.notify();
    }
  }
  
  update(updater) {
    this.set(updater(this.value));
  }
  
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  notify() {
    this.subscribers.forEach(callback => callback(this.value));
  }
}

// Global state signals
export const playerState = new Signal({
  playerId: null,
  registered: false,
  reputation: 'new'
});

export const roomState = new Signal({
  roomId: null,
  status: 'pending',
  players: [],
  turnIndex: 0,
  totalRolls: 0,
  fairnessStatus: 'normal',
  fairnessDetails: null,
  distribution: {},
  recentEvents: [],
  hashChain: { genesis: null, latest: null }
});

export const uiState = new Signal({
  theme: 'light',
  loading: false,
  error: null,
  notification: null
});

/**
 * React hook for using signals
 */
export function useSignal(signal) {
  const [value, setValue] = React.useState(signal.get());
  
  React.useEffect(() => {
    return signal.subscribe(setValue);
  }, [signal]);
  
  return [value, (newValue) => signal.set(newValue)];
}

/**
 * Actions for state updates
 */
export const actions = {
  setPlayer(playerId, reputation = 'new') {
    playerState.set({
      playerId,
      registered: true,
      reputation
    });
  },
  
  updateRoom(updates) {
    roomState.update(current => ({
      ...current,
      ...updates
    }));
  },
  
  setTheme(theme) {
    uiState.update(current => ({ ...current, theme }));
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  },
  
  setLoading(loading) {
    uiState.update(current => ({ ...current, loading }));
  },
  
  setError(error) {
    uiState.update(current => ({ ...current, error }));
  },
  
  showNotification(notification) {
    uiState.update(current => ({ ...current, notification }));
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      uiState.update(current => ({
        ...current,
        notification: current.notification === notification ? null : current.notification
      }));
    }, 5000);
  },
  
  clearNotification() {
    uiState.update(current => ({ ...current, notification: null }));
  }
};

// Initialize theme from localStorage
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('theme') || 'light';
  actions.setTheme(savedTheme);
}
