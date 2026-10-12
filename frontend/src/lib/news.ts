import "server-only";

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import mockNews from "@/data/mock-news.json";

type RawNews = {
  title?: unknown;
  source?: unknown;
  category?: unknown;
  published_at?: unknown;
  collected_at?: unknown;
  url?: unknown;
  summary?: unknown;
};

type RawProcessed = {
  url?: unknown;
  status?: unknown;
  needs_review?: unknown;
  extractive_summary?: unknown;
};

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  category: string;
  publishedAt: string;
  collectedAt: string;
  url: string;
  summary: string;
  keyPoints: string[];
  summaryKind: "ai" | "source" | "none";
};

export type NewsSnapshot = {
  date: string;
  today: string;
  todayCount: number;
  items: NewsItem[];
  isMock: boolean;
};

const projectRoot = path.resolve(process.cwd(), "..");
const dateFile = /^\d{4}-\d{2}-\d{2}\.json$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function beijingToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function readArray(file: string): Promise<unknown[] | null> {
  try {
    const value: unknown = JSON.parse(await readFile(file, "utf8"));
    return Array.isArray(value) ? value : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    console.error(`无法读取新闻文件 ${file}`, error);
    return null;
  }
}

function isHttpUrl(url: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function normalize(raw: unknown[], processed: unknown[]): NewsItem[] {
  const summaries = new Map<string, RawProcessed>();
  for (const value of processed) {
    if (value && typeof value === "object") {
      const row = value as RawProcessed;
      if (text(row.url)) summaries.set(text(row.url), row);
    }
  }

  const seen = new Set<string>();
  const items: NewsItem[] = [];
  for (const value of raw) {
    if (!value || typeof value !== "object") continue;
    const row = value as RawNews;
    const url = text(row.url);
    const title = text(row.title);
    if (!title || !isHttpUrl(url) || seen.has(url)) continue;
    seen.add(url);

    const result = summaries.get(url);
    const sentences = result?.status === "ok" && result.needs_review === false &&
      Array.isArray(result.extractive_summary)
      ? result.extractive_summary.filter((item): item is string => typeof item === "string" && !!item.trim()).map((item) => item.trim())
      : [];
    const sourceSummary = text(row.summary);

    items.push({
      id: createHash("sha256").update(url).digest("hex").slice(0, 16),
      title,
      source: text(row.source) || "未知来源",
      category: text(row.category) || "未分类",
      publishedAt: text(row.published_at),
      collectedAt: text(row.collected_at),
      url,
      summary: sentences.length ? sentences.join("") : sourceSummary,
      keyPoints: sentences,
      summaryKind: sentences.length ? "ai" : sourceSummary ? "source" : "none",
    });
  }
  // Date-only timestamps have no reliable time of day. Keep dates in order,
  // then alternate sources so one source does not occupy the entire first page.
  const byDay = new Map<string, NewsItem[]>();
  for (const item of items) {
    const day = item.publishedAt.slice(0, 10) || item.collectedAt.slice(0, 10);
    const group = byDay.get(day) ?? [];
    group.push(item);
    byDay.set(day, group);
  }
  const ordered: NewsItem[] = [];
  for (const day of [...byDay.keys()].sort().reverse()) {
    const buckets = new Map<string, NewsItem[]>();
    for (const item of byDay.get(day) ?? []) {
      const bucket = buckets.get(item.source) ?? [];
      bucket.push(item);
      buckets.set(item.source, bucket);
    }
    for (const bucket of buckets.values()) bucket.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    let remaining = true;
    while (remaining) {
      remaining = false;
      for (const bucket of buckets.values()) {
        const item = bucket.shift();
        if (item) {
          ordered.push(item);
          remaining = true;
        }
      }
    }
  }
  return ordered;
}

export async function getNewsSnapshot(): Promise<NewsSnapshot> {
  const today = beijingToday();
  const dataDir = path.join(projectRoot, "data");
  let dates: string[] = [];
  try {
    dates = (await readdir(dataDir)).filter((name) => dateFile.test(name) && name.slice(0, 10) <= today).sort().reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("无法列出新闻文件", error);
  }

  for (const filename of dates) {
    const date = filename.slice(0, 10);
    const raw = await readArray(path.join(dataDir, filename));
    if (!raw) continue;
    const processed = await readArray(path.join(projectRoot, "processed_context_guard", filename));
    const items = normalize(raw, processed ?? []);
    return { date, today, todayCount: date === today ? items.length : 0, items, isMock: false };
  }

  const items = normalize(mockNews, mockNews);
  return { date: "2026-10-12", today, todayCount: 0, items, isMock: true };
}

export async function getNewsById(id: string): Promise<NewsItem | undefined> {
  if (!/^[a-f0-9]{16}$/.test(id)) return undefined;
  const snapshot = await getNewsSnapshot();
  const current = snapshot.items.find((item) => item.id === id);
  if (current) return current;

  // Saved articles can outlive the day shown on the homepage. Resolve their
  // detail pages from the same local files, newest date first.
  const dataDir = path.join(projectRoot, "data");
  let dates: string[] = [];
  try {
    dates = (await readdir(dataDir))
      .filter((name) => dateFile.test(name) && name.slice(0, 10) <= snapshot.today && name.slice(0, 10) !== snapshot.date)
      .sort().reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("无法列出历史新闻文件", error);
  }

  for (const filename of dates) {
    const raw = await readArray(path.join(dataDir, filename));
    if (!raw) continue;
    const processed = await readArray(path.join(projectRoot, "processed_context_guard", filename));
    const found = normalize(raw, processed ?? []).find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
}
