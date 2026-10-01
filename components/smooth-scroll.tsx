"use client";

import { useEffect } from "react";
import { initSmoothScroll, destroySmoothScroll } from "@/lib/lenis";

export function SmoothScroll() {
  useEffect(() => {
    initSmoothScroll();

    return () => {
      destroySmoothScroll();
    };
  }, []);

  return null;
}
