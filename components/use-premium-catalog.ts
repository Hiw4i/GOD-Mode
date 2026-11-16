"use client";

import { useEffect, useState } from "react";
import { requestPremium } from "@/lib/premium-api";
import type { PremiumCatalog } from "@/lib/premium-model";

export function usePremiumCatalog() {
  const [catalog, setCatalog] = useState<PremiumCatalog | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;

    const refresh = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const result = await requestPremium("catalog", { signal: controller.signal });
        if (!Array.isArray(result.plans)
          || !Number.isSafeInteger(result.founders_sold)
          || result.founders_sold < 0
          || typeof result.checkout_enabled !== "boolean") {
          throw new Error("Invalid Premium catalog");
        }
        if (!controller.signal.aborted) setCatalog(result);
      } catch {
        if (!controller.signal.aborted) setCatalog(null);
      } finally {
        pending = false;
        if (!controller.signal.aborted) setLoaded(true);
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return { catalog, loaded };
}
