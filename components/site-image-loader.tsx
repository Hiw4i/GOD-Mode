"use client";

import { useEffect, useState } from "react";

const imageSources = [
  "/sources/statue for hero.webp?v=20260831-statues",
  "/sources/features-title.webp?v=20260831-fontfix",
  "/sources/features-title (blured).webp?v=20260831-fontfix",
  "/sources/statue for features.webp?v=20260831-statues",
  "/sources/statue for features (blured).webp?v=20260831-statues",
  "/sources/download-title.webp?v=20260831-fontfix",
  "/sources/download-title (blured).webp?v=20260831-fontfix",
  "/sources/statue for download.webp?v=20260831-statues",
  "/sources/statue for download (blured).webp?v=20260831-statues",
  "/sources/statue for support.webp?v=20260831-statues",
  "/sources/statue for support (blured).webp?v=20260831-statues",
  "/sources/youtube.jpg",
  "/sources/youtube (blured).webp",
  "/sources/tiktok.jpg",
  "/sources/tiktok (blured).webp",
  "/sources/instagram.jpg",
  "/sources/instagram (blured).webp",
  "/sources/music (1).jpg",
  "/sources/music (2).jpg",
  "/sources/music (3).jpg",
  "/sources/android.png",
  "/sources/linux.png",
  "/sources/google.png",
  "/sources/github.png",
] as const;

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
    const timeout = window.setTimeout(settle, 15000);
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

export function SiteImageLoader() {
  const [loaded, setLoaded] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let revealTimer = 0;
    const startedAt = performance.now();
    document.documentElement.classList.add("site-preloading");

    const imageLoads = imageSources.map((source) => preloadImage(source).then(() => {
      if (!cancelled) setLoaded((current) => current + 1);
    }));

    void Promise.all([...imageLoads, document.fonts.ready]).then(() => {
      if (cancelled) return;
      const delay = Math.max(0, 450 - (performance.now() - startedAt));
      revealTimer = window.setTimeout(() => {
        if (cancelled) return;
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
          if (cancelled) return;
          setLoaded(imageSources.length);
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

  const progress = Math.round((loaded / imageSources.length) * 100);

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
