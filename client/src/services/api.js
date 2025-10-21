import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
    console.error('API Error:', errorMessage);
    return Promise.reject(new Error(errorMessage));
  }
);

// API methods
const api = {
  // Player endpoints
  createPlayer: async (playerData) => {
    return await apiClient.post('/players', playerData);
  },

  getPlayer: async (playerId) => {
    return await apiClient.get(`/players/${playerId}`);
  },

  getPlayers: async (params = {}) => {
    return await apiClient.get('/players', { params });
  },

  updatePlayerReputation: async (playerId, reputationChange, reason) => {
    return await apiClient.patch(`/players/${playerId}`, {
      reputationChange,
      reason,
    });
  },

  // Game endpoints
  createGame: async (gameData) => {
    return await apiClient.post('/games', gameData);
  },

  getGame: async (gameId) => {
    return await apiClient.get(`/games/${gameId}`);
  },

  joinGame: async (gameId, data) => {
    return await apiClient.post(`/games/${gameId}/join`, data);
  },

  rollDice: async (gameId, rollData) => {
    return await apiClient.post(`/games/${gameId}/roll`, rollData);
  },

  getReport: async (gameId) => {
    return await apiClient.get(`/games/${gameId}/report`);
  },

  // Health check
  healthCheck: async () => {
    return await apiClient.get('/health');
  },
};

export default api;
