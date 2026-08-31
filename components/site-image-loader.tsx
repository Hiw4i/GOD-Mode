"use client";

import { useEffect, useState } from "react";
import { parseImageVariants, renderDprCap, selectImageVariant } from "@/lib/responsive-images";

const imageTimeoutMs = 5000;

function preloadImage(source: string) {
  return new Promise<void>((resolve) => {
    const image = new window.Image();
    let settled = false;
    let finishing = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(settle, imageTimeoutMs);
    const finish = () => {
      if (finishing || settled) return;
      finishing = true;
      if (typeof image.decode === "function") {
        void image.decode().catch(() => undefined).finally(settle);
      } else {
        settle();
      }
    };
    image.decoding = "async";
    image.loading = "eager";
    image.onload = finish;
    image.onerror = settle;
    image.src = source;
    if (image.complete) finish();
  });
}

function featureImageSources() {
  const sources = new Set<string>();
  document.querySelectorAll<SVGImageElement>('[data-xray-scene="features"] [data-paired-sources]').forEach((image) => {
    const plane = image.closest<HTMLElement>("[data-xray-plane]");
    const variants = parseImageVariants(image.dataset.pairedSources);
    if (!plane || variants.length === 0 || !plane.offsetWidth) return;
    sources.add(selectImageVariant(variants, plane.offsetWidth, renderDprCap()).src);
  });
  document.querySelectorAll<HTMLImageElement>(".floating-icons .float-icon").forEach((image) => {
    const source = image.currentSrc || image.src;
    if (source) sources.add(source);
  });
  return [...sources];
}

function waitForHero() {
  const image = document.querySelector<HTMLImageElement>('[data-site-critical="hero"]');
  if (!image) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let settled = false;
    let finishing = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      image.removeEventListener("load", finish);
      image.removeEventListener("error", settle);
      resolve();
    };
    const finish = () => {
      if (finishing || settled) return;
      finishing = true;
      if (typeof image.decode === "function") void image.decode().catch(() => undefined).finally(settle);
      else settle();
    };
    const timeout = window.setTimeout(settle, imageTimeoutMs);
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", settle, { once: true });
    if (image.complete) finish();
  });
}

export function SiteImageLoader() {
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(1);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let revealTimer = 0;
    const startedAt = performance.now();
    document.documentElement.classList.add("site-preloading");

    const tasks = [
      waitForHero(),
      ...featureImageSources().map(preloadImage),
      document.fonts.ready.then(() => undefined),
    ];
    window.queueMicrotask(() => {
      if (!cancelled) setTotal(tasks.length);
    });
    const trackedTasks = tasks.map((task) => task.then(() => {
      if (!cancelled) setLoaded((current) => current + 1);
    }));

    void Promise.all(trackedTasks).then(() => {
      if (cancelled) return;
      const delay = Math.max(0, 450 - (performance.now() - startedAt));
      revealTimer = window.setTimeout(() => {
        if (cancelled) return;
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
          if (cancelled) return;
          setLoaded(tasks.length);
          setDone(true);
          document.documentElement.classList.remove("site-preloading");
        }));
      }, delay);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
      document.documentElement.classList.remove("site-preloading");
    };
  }, []);

  const progress = Math.round((loaded / total) * 100);

  return (
    <>
      <noscript><style>{".site-loader{display:none!important}"}</style></noscript>
      <div className={`site-loader${done ? " site-loader--done" : ""}`} aria-hidden={done || undefined}>
        <div className="site-loader__brand"><span>GOD</span> mode</div>
        <div className="site-loader__track" role="progressbar" aria-label="Loading site images" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <span className="site-loader__bar" style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <div className="site-loader__value">{progress}%</div>
      </div>
    </>
  );
}
