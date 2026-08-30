"use client";

import { useEffect, useRef, useState } from "react";

export function CruelStopwatch() {
  const ref = useRef<HTMLDivElement>(null);
  const [seconds, setSeconds] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (!entry.isIntersecting) setSeconds(0);
    }, { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [visible]);

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");

  return <div ref={ref} className={`cruel-timer${visible ? " is-counting" : " is-reset"}`}>{minutes}:{rest}</div>;
}
