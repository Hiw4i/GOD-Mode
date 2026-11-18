"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserAuth } from "@/lib/account-auth";
import { PremiumRequestError, requestPremium } from "@/lib/premium-api";
import { AccountSignIn } from "./account-sign-in";

export function AccountDeletion() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [requiresCancellation, setRequiresCancellation] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const auth = getBrowserAuth();

  useEffect(() => {
    if (!auth) {
      let mounted = true;
      queueMicrotask(() => { if (mounted) setSession(null); });
      return () => { mounted = false; };
    }
    const callback = new URLSearchParams(window.location.search);
    const { data: { subscription } } = auth.onAuthStateChange((event, current) => {
      setSession(current);
      if (event === "INITIAL_SESSION" && callback.has("error")) {
        setFeedback({ message: "Sign-in did not complete. Try again or use email.", error: true });
        window.history.replaceState(null, "", "/delete-account/");
      }
    });
    return () => subscription.unsubscribe();
  }, [auth]);

  const email = session?.user.email;
  const confirmed = !!email && email.toLowerCase() === confirmation.trim().toLowerCase();

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !confirmed || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await requestPremium("delete_account", { token: session.access_token, input: { confirmed: true } });
      if (result.result !== "deleted") throw new Error("Deletion could not be verified");
      setDeleted(true);
      void auth?.signOut({ scope: "local" }).then(({ error }) => {
        if (error) console.warn("Could not clear the browser session after account deletion");
      }, () => console.warn("Could not clear the browser session after account deletion"));
    } catch (error) {
      const code = error instanceof PremiumRequestError ? error.code : null;
      setRequiresCancellation(code === "subscription_active");
      const message = code === "subscription_active" ? "Turn off automatic renewal before deleting your account."
        : code === "payment_pending" ? "A checkout is still being checked. Wait for it to finish or contact support before retrying."
        : code === "unauthorized" ? "Your session expired. Sign in again before trying to delete your account."
        : "We could not confirm deletion. Try again or contact support.";
      setFeedback({ message, error: true });
    } finally {
      setBusy(false);
    }
  }

  async function cancelRenewal() {
    if (!session || busy) return;
    setBusy(true);
    try {
      const result = await requestPremium("cancel", { token: session.access_token });
      setRequiresCancellation(result.can_cancel);
      setFeedback({ message: result.can_cancel ? "Cancellation is being checked. Wait for confirmation before deleting your account." : "Automatic renewal is off. You can now try deleting your account.", error: false });
    } catch {
      setFeedback({ message: "We could not confirm cancellation. Try again or contact support.", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!auth || busy) return;
    setBusy(true);
    try {
      const { error } = await auth.signOut({ scope: "local" });
      if (error) throw error;
      setConfirmation("");
      setFeedback(null);
      setRequiresCancellation(false);
    } catch {
      setFeedback({ message: "Could not sign out. Try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  if (deleted) return <p role="status">Your GOD Mode account and cloud data were deleted.</p>;
  if (session === undefined) return <p className="account-muted" role="status">Checking your account…</p>;
  if (!auth) return <p className="account-error" role="alert">Account services are currently unavailable.</p>;

  return <section className="account-auth" aria-labelledby="deletion-title">
    {session ? <>
      <p className="account-muted">Your GOD Mode cloud data and Premium access will be deleted. Local copies stay on your devices.</p>
      {email && !requiresCancellation && (
        <form className="signup-form account-form" onSubmit={deleteAccount}>
          <label className="account-delete-email" htmlFor="confirm-delete-email">Type <strong>{email}</strong> to confirm</label>
          <input id="confirm-delete-email" type="email" autoComplete="off" className="signup-input" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          <button className="btn btn-outline account-delete-button" type="submit" disabled={busy || !confirmed}>{busy ? "Deleting…" : "Delete permanently"}</button>
        </form>
      )}
      {!email && <p className="account-muted">Contact support to delete an account without an email address.</p>}
      {feedback && <p className={feedback.error ? "account-error" : "account-muted"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p>}
      {requiresCancellation && <button className="btn btn-outline" type="button" disabled={busy} onClick={() => void cancelRenewal()}>{busy ? "Checking…" : "Turn off automatic renewal"}</button>}
      <button className="account-text-button" type="button" disabled={busy} onClick={() => void signOut()}>Use another account</button>
    </> : <>
      <p className="account-muted">Sign in to your GOD Mode account.</p>
      {feedback && <p className="account-error" role="alert">{feedback.message}</p>}
      <AccountSignIn existingAccountOnly />
    </>}
  </section>;
}
