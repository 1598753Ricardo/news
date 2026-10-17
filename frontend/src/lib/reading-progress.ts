"use client";

import { useSyncExternalStore } from "react";

export const READING_STORAGE_KEY = "xueyouyuli-news:reading:v1";

const changeEvent = "xueyouyuli-news:reading-change";
const emptySnapshot = "{}";
type ReadingState = Record<string, string[]>;

function parseReading(raw: string): ReadingState {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result: ReadingState = {};
    for (const [date, urls] of Object.entries(value)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(urls)) {
        result[date] = [...new Set(urls.filter((url): url is string =>
          typeof url === "string" && /^https?:\/\//.test(url)))];
      }
    }
    return result;
  } catch {
    return {};
  }
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(READING_STORAGE_KEY) ?? emptySnapshot;
  } catch {
    return emptySnapshot;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === READING_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const subscribeHydration = () => () => {};

export function useReadingProgress(date: string): { readUrls: Set<string>; hydrated: boolean } {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => emptySnapshot);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  return { readUrls: new Set(parseReading(raw)[date] ?? []), hydrated };
}

export function setReadStatus(date: string, url: string, read: boolean): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^https?:\/\//.test(url)) return false;
  try {
    const state = parseReading(getSnapshot());
    const urls = new Set(state[date] ?? []);
    if (read) urls.add(url);
    else urls.delete(url);
    state[date] = [...urls];
    window.localStorage.setItem(READING_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(changeEvent));
    return true;
  } catch {
    return false;
  }
}
