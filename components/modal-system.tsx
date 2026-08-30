"use client";

import Image from "next/image";
import { Grid2X2, Smartphone } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type ModalId = "crypto" | "download" | "premium" | "signup";

const addresses = [
  ["USDT (SOL)", "TExampleAddress1234567890abc"],
  ["BTC", "bc1qexampleaddress000000000"],
  ["ETH", "0xExampleAddress1234567890"],
  ["SOL", "ExampleAddress1234567890abc"],
] as const;

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" stroke="none" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

export function ModalSystem() {
  const [open, setOpen] = useState<ModalId | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-open-modal]") : null;
      const id = target?.dataset.openModal as ModalId | undefined;
      if (!id) return;
      event.preventDefault();
      returnFocusRef.current = target;
      setOpen(id);
    };
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.documentElement.classList.toggle("modal-open", Boolean(open));
    window.dispatchEvent(new CustomEvent("godmode:modal", { detail: { open: Boolean(open) } }));
    if (open) {
      window.addEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>("button, a, input")?.focus());
    } else {
      returnFocusRef.current?.focus();
    }
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const flashSelected = (value: string) => {
    setSelected(value);
    window.setTimeout(() => setSelected((current) => current === value ? null : current), 2000);
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(value);
    window.setTimeout(() => setCopied((current) => current === value ? null : current), 2000);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(true);
    window.setTimeout(() => {
      setSuccess(false);
      setOpen(null);
      event.currentTarget.reset();
    }, 1800);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay open" onMouseDown={(event) => event.target === event.currentTarget && setOpen(null)}>
      <div ref={dialogRef} className="modal glass-card" role="dialog" aria-modal="true" aria-labelledby={`${open}-modal-title`}>
        <button className="modal-close" type="button" aria-label="Close modal" onClick={() => setOpen(null)}>×</button>

        {open === "crypto" && (
          <>
            <h3 className="modal-title" id="crypto-modal-title">Crypto Addresses</h3>
            {addresses.map(([label, address]) => (
              <div className="modal-item" key={label}>
                <span className="modal-label">{label}</span>
                <button className={`modal-address${copied === address ? " copied" : ""}`} type="button" onClick={() => copy(address)}>
                  {copied === address ? "Copied ✓" : address}
                </button>
              </div>
            ))}
          </>
        )}

        {open === "download" && (
          <>
            <h3 className="modal-title" id="download-modal-title">Choose Your Platform</h3>
            <div className="download-os-grid">
              {[
                ["android", <Smartphone key="a" />, "Android"],
                ["ios", <Smartphone key="i" />, "iOS"],
                ["windows", <Grid2X2 key="w" />, "Windows"],
                ["linux", <Image key="l" src="/sources/linux.png" alt="" width={28} height={28} />, "Linux"],
                ["macos", <AppleIcon key="m" />, "macOS"],
              ].map(([id, icon, label]) => (
                <button key={String(id)} className={`selectable-btn download-os-btn${selected === id ? " selected" : ""}`} type="button" onClick={() => flashSelected(String(id))}>
                  {icon}<span>{label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {open === "premium" && (
          <>
            <h3 className="modal-title" id="premium-modal-title">Sign in to secure your Premium</h3>
            <div className="premium-auth-grid">
              {["google", "github"].map((provider) => (
                <button key={provider} className={`selectable-btn premium-auth-btn${selected === provider ? " selected" : ""}`} type="button" onClick={() => flashSelected(provider)}>
                  <Image src={`/sources/${provider}.png`} alt="" width={36} height={36} />
                  <span>{provider[0].toUpperCase() + provider.slice(1)}</span>
                </button>
              ))}
            </div>
            <button className="premium-email-note" type="button" onClick={() => setOpen("signup")}>or use email</button>
          </>
        )}

        {open === "signup" && (
          <>
            <h3 className="modal-title" id="signup-modal-title">Create your account</h3>
            <form className="signup-form" onSubmit={submit}>
              <input className="signup-input" type="text" name="name" autoComplete="name" placeholder="Name" required />
              <input className="signup-input" type="email" name="email" autoComplete="email" placeholder="Email" required />
              <input className="signup-input" type="password" name="password" autoComplete="new-password" placeholder="Password" required />
              <button className={`signup-submit${success ? " success" : ""}`} type="submit">{success ? "✓ Welcome!" : "Sign Up"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
