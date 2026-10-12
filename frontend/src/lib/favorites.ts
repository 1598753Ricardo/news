import { useSyncExternalStore } from "react";

import type { NewsItem } from "@/lib/news";

export const FAVORITES_STORAGE_KEY = "xueyouyuli-news:favorites:v1";

const changeEvent = "xueyouyuli-news:favorites-change";
const emptySnapshot = "[]";

export type FavoriteEntry = {
  url: string;
  news: NewsItem;
  savedAt: string;
};

function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isNewsItem(value: unknown): value is NewsItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<NewsItem>;
  return typeof item.id === "string" && /^[a-f0-9]{16}$/.test(item.id) &&
    typeof item.url === "string" && isHttpUrl(item.url) &&
    typeof item.title === "string" && !!item.title.trim() &&
    typeof item.source === "string" && typeof item.category === "string" &&
    typeof item.publishedAt === "string" && typeof item.collectedAt === "string" &&
    typeof item.summary === "string" &&
    Array.isArray(item.keyPoints) && item.keyPoints.every((point) => typeof point === "string") &&
    (item.summaryKind === "ai" || item.summaryKind === "source" || item.summaryKind === "none");
}

function parseFavorites(raw: string): FavoriteEntry[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((entry): entry is FavoriteEntry => {
      if (!entry || typeof entry !== "object") return false;
      const record = entry as Partial<FavoriteEntry>;
      if (typeof record.url !== "string" || !isNewsItem(record.news) ||
          record.url !== record.news.url || typeof record.savedAt !== "string" ||
          seen.has(record.url)) return false;
      seen.add(record.url);
      return true;
    });
  } catch {
    return [];
  }
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? emptySnapshot;
  } catch {
    return emptySnapshot;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === FAVORITES_STORAGE_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener(changeEvent, onStoreChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

const subscribeHydration = () => () => {};

export function useFavorites(): { entries: FavoriteEntry[]; hydrated: boolean } {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => emptySnapshot);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  return { entries: parseFavorites(raw), hydrated };
}

export function toggleFavorite(news: NewsItem): boolean {
  try {
    const current = parseFavorites(getSnapshot());
    const entries = current.some((entry) => entry.url === news.url)
      ? current.filter((entry) => entry.url !== news.url)
      : [{ url: news.url, news, savedAt: new Date().toISOString() }, ...current];
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event(changeEvent));
    return true;
  } catch {
    return false;
  }
}
