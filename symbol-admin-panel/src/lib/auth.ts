// This file handles JWT token storage in localStorage.
// It ensures that localStorage is only accessed on the client-side.

const TOKEN_KEY = 'authToken';

export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const isAuthenticated = (): boolean => {
  const token = getToken();
  // A more robust check could decode the token and check its expiration
  return !!token;
};
