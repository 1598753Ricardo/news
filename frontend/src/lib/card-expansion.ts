"use client";

import { useCallback, useState } from "react";

export function useCardExpansion() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setExpandedId((current) => current === id ? null : id);
  }, []);

  const close = useCallback(() => setExpandedId(null), []);

  return { expandedId, isExpanded: (id: string) => expandedId === id, toggle, close };
}
