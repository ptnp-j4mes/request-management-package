"use client";

import type { AuthUser } from "@rm/types";

export const ACCESS_TOKEN_KEY = "rm_access_token";
export const REFRESH_TOKEN_KEY = "rm_refresh_token";
export const USER_KEY = "rm_user";
export const COOKIE_NAME = "rm_token";
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
const AUTH_CHANGE_EVENT = "rm-auth-change";

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function getStoredAccessToken() {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken() {
  if (!isBrowser()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser() {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token: string) {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function setStoredRefreshToken(token: string) {
  if (!isBrowser()) return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function setStoredUser(user: AuthUser) {
  if (!isBrowser()) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function setAuthCookie(value: string) {
  if (!isBrowser()) return;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearAuthCookie() {
  if (!isBrowser()) return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function storeAuthSession(params: {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}) {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, params.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, params.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(params.user));
  setAuthCookie(params.refreshToken);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function clearAuthStorage() {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearAuthCookie();
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function syncAccessToken(token: string | null) {
  if (!isBrowser()) return;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function subscribeAuthChanges(listener: () => void) {
  if (!isBrowser()) return () => {};
  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, listener);
}
