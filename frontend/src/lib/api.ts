import axios, { AxiosInstance, AxiosError } from 'axios';

// API Base URL - different for client and server
const getBaseURL = () => {
  if (typeof window === 'undefined') {
    // Server-side: use internal Docker network URL
    return process.env.NEXT_PUBLIC_API_URL_SERVER || 'http://backend:8000/api/v1';
  }
  // Client-side: use external URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
};

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    } else {
      // Other errors
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// API functions
export const f1Api = {
  // Seasons
  getSeasons: () =>
    api.get('/seasons/'),
  
  getSeason: (id: number) =>
    api.get(`/seasons/${id}/`),

  // Drivers
  getDrivers: (params?: { nationality?: string; search?: string; season?: number }) =>
    api.get('/drivers/', { params }),
  
  getDriver: (id: number) =>
    api.get(`/drivers/${id}/`),

  // Driver Seasons (with team data, colors, and career stats)
  getDriverSeasons: (params?: { season__year?: number; driver?: number; constructor?: number }) =>
    api.get('/driver-seasons/', { params }),
  
  getDriverSeason: (id: number) =>
    api.get(`/driver-seasons/${id}/`),

  // Constructors
  getConstructors: (params?: { nationality?: string; search?: string; season?: number }) =>
    api.get('/constructors/', { params }),
  
  getConstructor: (id: number) =>
    api.get(`/constructors/${id}/`),

  // Races
  getRaces: (params?: { season?: number; country?: string }) =>
    api.get('/races/', { params }),
  
  getRace: (id: number) =>
    api.get(`/races/${id}/`),

  // Results
  getResults: (params?: { race__season?: number; race?: number; driver?: number }) =>
    api.get('/results/', { params }),
  
  getResult: (id: number) =>
    api.get(`/results/${id}/`),

  // Standings
  getStandings: (params?: { season?: number; standing_type?: 'driver' | 'constructor'; round?: number }) =>
    api.get('/standings/', { params }),
  
  getStanding: (id: number) =>
    api.get(`/standings/${id}/`),

  // Progressive standings (cumulative points up to a specific round)
  getProgressiveStandings: (params: { season: number; round: number; type?: 'driver' | 'constructor' }) =>
    api.get('/standings/progressive/', { params }),

  // Qualifying
  getQualifying: (params?: { race__season?: number; race?: number; driver?: number }) =>
    api.get('/qualifying/', { params }),

  // Sprint
  getSprint: (params?: { race__season?: number; race?: number; driver?: number }) =>
    api.get('/sprint/', { params }),

  // Laps
  getLaps: (params?: { race?: number; driver?: number }) =>
    api.get('/laps/', { params }),
};

export default api;
