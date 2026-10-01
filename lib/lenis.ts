import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

// Register GSAP ScrollTrigger plugin safely on client
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Exported lenis instance reference
export let lenis: Lenis | null = null;

let lenisInstance: Lenis | null = null;
let tickerCallback: ((time: number) => void) | null = null;
let loadHandler: (() => void) | null = null;

/**
 * Initializes Lenis smooth scrolling synced with GSAP ScrollTrigger.
 * Respects `prefers-reduced-motion` and handles font/image layout refresh.
 */
export function initSmoothScroll(): Lenis | null {
  if (typeof window === "undefined") {
    return null;
  }

  // 1. Respect prefers-reduced-motion:
  // If user prefers reduced motion, skip Lenis (fall back to native scroll)
  // and configure ScrollTrigger to skip animations and show final states directly.
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    ScrollTrigger.config({ limitCallbacks: true });
    // Disable any existing scroll triggers or force them to progress 1 (final state)
    ScrollTrigger.getAll().forEach((trigger) => {
      trigger.disable(false);
    });
    lenis = null;
    lenisInstance = null;
    return null;
  }

  // If an instance is already active, return it
  if (lenisInstance) {
    lenis = lenisInstance;
    return lenisInstance;
  }

  // 2. Initialize Lenis with smooth deceleration defaults
  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: "vertical",
    gestureOrientation: "vertical",
    smoothWheel: true,
    touchMultiplier: 1.5,
  });

  lenis = lenisInstance;

  // 3. Sync Lenis scroll event to ScrollTrigger.update
  lenisInstance.on("scroll", ScrollTrigger.update);

  // 4. Drive Lenis's RAF loop using GSAP's ticker (keeps GSAP & Lenis in sync)
  tickerCallback = (time: number) => {
    lenisInstance?.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);

  // 5. Disable lagSmoothing(0) to prevent jumpy animations after tab switches
  gsap.ticker.lagSmoothing(0);

  // 6. Refresh ScrollTrigger after all fonts and assets load
  loadHandler = () => {
    ScrollTrigger.refresh();
  };

  if (document.readyState === "complete") {
    ScrollTrigger.refresh();
  } else {
    window.addEventListener("load", loadHandler, { once: true });
  }

  if ("fonts" in document) {
    document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
    });
  }

  return lenisInstance;
}

/**
 * Clean up Lenis instance, GSAP ticker callback, and event listeners.
 */
export function destroySmoothScroll(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
  }

  if (loadHandler) {
    window.removeEventListener("load", loadHandler);
    loadHandler = null;
  }

  if (lenisInstance) {
    lenisInstance.off("scroll", ScrollTrigger.update);
    lenisInstance.destroy();
    lenisInstance = null;
    lenis = null;
  }
}
