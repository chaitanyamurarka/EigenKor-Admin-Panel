// This file provides secure JWT token storage using HTTP-only cookies
// It replaces the vulnerable localStorage approach

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};

export const setToken = async (token: string, refreshToken?: string): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_KEY, token, COOKIE_OPTIONS);
  
  if (refreshToken) {
    cookieStore.set(REFRESH_TOKEN_KEY, refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30, // 30 days for refresh token
    });
  }
};

export const getToken = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_KEY)?.value || null;
};

export const getRefreshToken = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_KEY)?.value || null;
};

export const removeToken = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_KEY);
  cookieStore.delete(REFRESH_TOKEN_KEY);
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getToken();
  return !!token;
};

// Server-side token validation
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/auth/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    return response.ok;
  } catch {
    return false;
  }
};
