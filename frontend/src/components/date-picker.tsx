"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { formatDate } from "@/lib/format";

type Props = {
  selectedDate: string;
  latestDate: string;
  today: string;
  availableDates: string[];
};

const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function recentDates(today: string): string[] {
  const current = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(current);
    day.setUTCDate(day.getUTCDate() - index);
    return day.toISOString().slice(0, 10);
  });
}

function monthDay(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

export function DatePicker({ selectedDate, latestDate, today, availableDates }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const recent = recentDates(today);
  const available = new Set(availableDates);
  const older = availableDates.filter((date) => !recent.includes(date));

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        containerRef.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function hrefFor(date: string): string {
    return date === latestDate ? "/" : `/?date=${date}`;
  }

  return (
    <div ref={containerRef} className="relative block w-full sm:inline-block sm:w-auto">
      <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen((value) => !value)} className="inline-flex min-h-11 items-center gap-2.5 rounded-xl border border-[#dce6e1] bg-white px-3.5 text-[13px] font-medium text-[#3a5551] shadow-[0_2px_8px_rgba(29,57,49,.035)] transition-[border-color,background-color] hover:border-[#9fc2b5] hover:bg-[#f8fbf9] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-[#6c9186]" aria-hidden="true"><rect x="2.5" y="4" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M6 2.5v3M14 2.5v3M2.5 8h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        <time dateTime={selectedDate}>{formatDate(selectedDate)}</time>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className={`text-[#728d83] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true"><path d="m3.5 6 4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && <div id={panelId} role="dialog" aria-label="选择简报日期" className="date-popover absolute left-0 top-[calc(100%+10px)] z-40 w-[322px] max-w-[calc(100vw-40px)] rounded-[18px] border border-[#dce6e1] bg-white p-4 shadow-[0_22px_60px_rgba(25,54,48,.16)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-[#28413e]">选择简报日期</p>
          <span className="text-[11px] text-[#8a9d97]">{availableDates.length} 个可用日期</span>
        </div>
        <p className="mt-5 text-[11px] font-medium text-[#708781]">最近 7 天</p>
        <nav className="mt-2 space-y-0.5" aria-label="最近七天日期">
          {recent.map((date, index) => {
            const day = new Date(`${date}T00:00:00Z`);
            const selected = date === selectedDate;
            const relative = index === 0 ? "今天" : index === 1 ? "昨天" : "";
            const content = <><span className="flex items-center gap-2"><span className="text-[13px] font-semibold tabular-nums">{monthDay(date)}</span>{relative && <span className={`text-[10px] ${selected ? "text-white/75" : "text-[#87a095]"}`}>{relative}</span>}</span><span className={`text-[10px] ${selected ? "text-white/75" : "text-[#9aaca3]"}`}>{weekdays[day.getUTCDay()]}{selected && <span className="ml-1.5" aria-hidden="true">✓</span>}</span></>;
            return available.has(date) ? <Link key={date} href={hrefFor(date)} scroll={false} onClick={() => setOpen(false)} aria-label={`${formatDate(date)}${relative ? `，${relative}` : ""}`} aria-current={selected ? "date" : undefined} className={`flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] ${selected ? "bg-[#2e6557] text-white" : "text-[#46645b] hover:bg-[#edf5f0]"}`}>{content}</Link> : <span key={date} aria-label={`${formatDate(date)}，暂无简报`} className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-[#b3c0bb]"><span className="flex items-center gap-2"><span className="text-[13px] font-medium tabular-nums">{monthDay(date)}</span>{relative && <span className="text-[10px]">{relative}</span>}</span><span className="text-[10px]">{weekdays[day.getUTCDay()]}</span></span>;
          })}
        </nav>

        <div className="mt-4 border-t border-[#edf1ee] pt-4">
          <p className="text-[11px] font-medium text-[#708781]">更早的简报</p>
          {older.length ? <nav aria-label="更早的可选日期" className="mt-2 max-h-36 space-y-1 overflow-y-auto">
            {older.map((date) => <Link key={date} href={hrefFor(date)} scroll={false} onClick={() => setOpen(false)} aria-current={date === selectedDate ? "date" : undefined} className={`flex min-h-9 items-center justify-between rounded-lg px-2.5 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] ${date === selectedDate ? "bg-[#e8f3ec] font-semibold text-[#286651]" : "text-[#49625b] hover:bg-[#f1f6f2]"}`}><span>{formatDate(date)}</span>{date === selectedDate && <span className="text-[11px]">已选</span>}</Link>)}
          </nav> : <p className="mt-3 text-[11px] text-[#9aaba5]">暂无更早的简报</p>}
        </div>
        <p className="mt-4 text-[10px] leading-5 text-[#9aaba5]">灰色日期暂无已生成的摘要</p>
      </div>}
    </div>
  );
}
