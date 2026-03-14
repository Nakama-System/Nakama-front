"use client";

// ═══════════════════════════════════════════════════════════
// hooks/useScrollBlur.ts
// Detecta scroll down/up en un contenedor y devuelve si el
// header debe ocultarse. Usado para difuminar el header del
// sidebar al hacer scroll hacia abajo.
// ═══════════════════════════════════════════════════════════

import { useRef, useEffect, useState, useCallback } from "react";

interface UseScrollBlurOptions {
  /** px que debe scrollear antes de ocultar el header */
  threshold?: number;
  /** ms de debounce */
  debounce?: number;
}

export function useScrollBlur(options: UseScrollBlurOptions = {}) {
  const { threshold = 60, debounce = 40 } = options;

  const containerRef   = useRef<HTMLDivElement | null>(null);
  const lastScrollY    = useRef(0);
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [headerHidden,  setHeaderHidden]  = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;

      const currentY = el.scrollTop;
      const isScrolled = currentY > 4;
      setHeaderScrolled(isScrolled);

      if (currentY > lastScrollY.current && currentY > threshold) {
        // Scrolleando hacia abajo → ocultar header
        setHeaderHidden(true);
      } else if (currentY < lastScrollY.current - 10) {
        // Scrolleando hacia arriba → mostrar header
        setHeaderHidden(false);
      }

      lastScrollY.current = currentY;
    }, debounce);
  }, [threshold, debounce]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleScroll]);

  return { containerRef, headerHidden, headerScrolled };
}