"use client";

import { useEffect, useState } from "react";

const mobileCards = "(max-width: 639px)";

export function useCardExpansion() {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  useEffect(() => {
    const media = window.matchMedia(mobileCards);
    const keepOneOpen = (event: MediaQueryListEvent) => {
      if (event.matches) setExpandedIds((ids) => ids.slice(-1));
    };
    media.addEventListener("change", keepOneOpen);
    return () => media.removeEventListener("change", keepOneOpen);
  }, []);

  function toggle(id: string) {
    setExpandedIds((ids) => {
      if (ids.includes(id)) return ids.filter((item) => item !== id);
      return window.matchMedia(mobileCards).matches ? [id] : [...ids, id];
    });
  }

  return { isExpanded: (id: string) => expandedIds.includes(id), toggle };
}
