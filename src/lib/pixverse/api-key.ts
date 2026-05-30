"use client";

const STORAGE_KEY = "pixverse_api_key";

/** Browser-only PixVerse key (never send server routes). */
export function getPixverseApiKey(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_PIXVERSE_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEY)?.trim() || null;
  }

  return null;
}

export function setPixverseApiKey(key: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, key.trim());
  }
}

export function hasPixverseApiKey(): boolean {
  return Boolean(getPixverseApiKey());
}
