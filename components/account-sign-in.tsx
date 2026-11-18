"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { getBrowserAuth } from "@/lib/account-auth";

const oauthProviders = ["google", "github"] as const;
export const oauthReturnIntent = "godmode.account.return";

type SignInProps = { checkoutId: string | null; plan: string | null; existingAccountOnly?: never }
  | { existingAccountOnly: true; checkoutId?: never; plan?: never };

export function AccountSignIn({ checkoutId, plan, existingAccountOnly }: SignInProps) {
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signInWith(provider: (typeof oauthProviders)[number]) {
    const auth = getBrowserAuth();
    if (!auth || busy) return;
    setBusy(true);
    setError("");
    try {
      const intent = new URLSearchParams();
      if (checkoutId) intent.set("checkout", checkoutId);
      if (plan) intent.set("plan", plan);
      if (existingAccountOnly) intent.set("returnTo", "delete-account");
      sessionStorage.setItem(oauthReturnIntent, intent.toString());
      const { error } = await auth.signInWithOAuth({
        provider,
        options: { redirectTo: new URL("/account/", window.location.origin).href },
      });
      if (error) throw error;
    } catch {
      setError("Could not open sign-in. Try again or use email.");
      setBusy(false);
    }
  }

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const auth = getBrowserAuth();
    if (!auth || busy) return;
    setBusy(true);
    setError("");
    try {
      if (sentEmail) {
        const { error } = await auth.verifyOtp({ email: sentEmail, token: token.trim(), type: "email" });
        if (error) throw error;
      } else {
        const address = email.trim();
        const { error } = await auth.signInWithOtp({
          email: address,
          options: { shouldCreateUser: !existingAccountOnly },
        });
        if (error) throw error;
        setSentEmail(address);
      }
    } catch {
      setError(sentEmail
        ? "Could not verify that code. Check it or request a new one."
        : "Could not send a code. Check the address and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="premium-auth-grid">
        {oauthProviders.map((provider) => (
          <button
            key={provider}
            className="selectable-btn premium-auth-btn"
            type="button"
            disabled={busy}
            onClick={() => void signInWith(provider)}
          >
            <Image src={`/sources/${provider}.png`} alt="" width={28} height={28} />
            {provider === "google" ? "Google" : "GitHub"}
          </button>
        ))}
      </div>
      <p className="account-auth-separator">or</p>
      <form className="signup-form account-form" onSubmit={handleEmail}>
        {sentEmail ? (
          <>
            <label htmlFor="account-code">Code sent to {sentEmail}</label>
            <input
              id="account-code"
              className="signup-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              maxLength={10}
              required
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </>
        ) : (
          <>
            <label htmlFor="account-email">Email address</label>
            <input
              id="account-email"
              type="email"
              className="signup-input"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </>
        )}
        {error && <p role="alert" className="account-error">{error}</p>}
        <button className="signup-submit" type="submit" disabled={busy}>
          {sentEmail ? "Verify code" : "Send code"}
        </button>
        {sentEmail && (
          <button
            className="account-text-button"
            type="button"
            disabled={busy}
            onClick={() => { setSentEmail(""); setToken(""); setError(""); }}
          >
            Change email or resend code
          </button>
        )}
      </form>
    </>
  );
}
