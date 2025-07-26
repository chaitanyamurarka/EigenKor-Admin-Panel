import axios from 'axios';
import { getToken } from './auth';
import {
  LoginCredentials,
  User,
  SearchParams,
  Symbol,
  IngestedSymbol,
  SystemConfig,
} from './types';


// const getApiBaseUrl = () => {
//   if (typeof window !== 'undefined') {
//     // Enforce HTTPS protocol for security
//     const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
//     // Use HTTPS in production, HTTP only for localhost development
//     const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
//     const port = isLocalhost ? '8500' : '8500'; // In production, use standard HTTPS port (443)
//     return `${protocol}//${window.location.hostname}${isLocalhost ? ':' + port : ''}`;
//   }
//   // Fallback for server-side rendering or build processes
//   return process.env.NODE_ENV === 'production' ? 'https://localhost:8500' : 'http://localhost:8500';
// };

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // This code runs in the browser, so we can use the window.location object.
    // It constructs the base URL from the current page's hostname.
    // e.g., if you access http://192.168.1.5:3000, it will use http://192.168.1.5:8500
    return `${window.location.protocol}//${window.location.hostname}:8500`;
  }
  // Fallback for server-side rendering or build processes
  return 'http://localhost:8500';
};

const API_BASE_URL = getApiBaseUrl();


const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to include the token in headers
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


export const searchSymbols = async (params: SearchParams): Promise<Symbol[]> => {
  const response = await api.get('/search_symbols/', { params });
  return response.data;
};

// New function to get ingested symbols
export const getIngestedSymbols = async (): Promise<IngestedSymbol[]> => {
  const response = await api.get('/get_ingestion_symbols/');
  return response.data;
};

export const addSymbol = async (symbol: IngestedSymbol): Promise<any> => {
  const response = await api.post('/add_ingestion_symbol/', symbol);
  return response.data;
};

export const removeIngestedSymbol = async (symbol: IngestedSymbol): Promise<any> => {
  const response = await api.post('/remove_ingestion_symbol/', symbol);
  return response.data;
};

export const setSymbols = async (symbols: IngestedSymbol[]): Promise<any> => {
    const response = await api.post('/set_ingestion_symbols/', symbols);
    return response.data;
};

export const getSystemConfig = async (): Promise<SystemConfig> => {
  const response = await api.get('/get_system_config/');
  return response.data;
};

export const setSystemConfig = async (config: SystemConfig): Promise<any> => {
    const response = await api.post('/set_system_config/', config);
    return response.data;
};

// --- Auth Endpoints ---

export const loginUser = async (
  credentials: LoginCredentials
): Promise<{ access_token: string }> => {
  const params = new URLSearchParams();
  params.append('username', credentials.username);
  params.append('password', credentials.password);

  // The backend expects form data for the token endpoint
  const response = await api.post('/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/users/me/');
  return response.data;
};
