"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getBrowserAuth } from "@/lib/account-auth";
import { PremiumRequestError, requestPremium } from "@/lib/premium-api";
import {
  availablePlans,
  isPlanId,
  parseAccountQuery,
  premiumPlans,
  providerCheckoutUrl,
  type CheckoutState,
  type PlanId,
  type PremiumCatalog,
  type Subscription,
} from "@/lib/premium-model";
import { AccountSignIn, oauthReturnIntent } from "./account-sign-in";
import { PremiumPlanCard } from "./premium-plan-card";
import { usePremiumCatalog } from "./use-premium-catalog";

const statusLabels: Record<Subscription["status"], string> = {
  free: "Free",
  active: "Active",
  cancelled: "Renewal cancelled",
  past_due: "Payment past due",
  expired: "Expired",
  revoked: "Access revoked",
};

const checkoutLabels: Record<CheckoutState, string> = {
  creating: "Preparing your checkout…",
  open: "Checkout is open. Premium activates after payment is confirmed.",
  unknown: "We’re checking your payment with lava.top. Please wait before paying again.",
  paid: "Payment confirmed. Sign in to GOD Mode with this same account to use Premium.",
  closed: "Checkout closed. Choose a plan if you’d like to try again.",
};

const requestErrors: Record<string, string> = {
  unauthorized: "Your session ended. Sign in again to continue.",
  checkout_disabled: "New purchases are currently unavailable.",
  plan_unavailable: "That plan is no longer available. Refresh and choose another plan.",
  already_premium: "This account already has Premium.",
  checkout_pending: "A checkout is already in progress. Refresh to check its status.",
  checkout_not_found: "This checkout does not belong to the signed-in account. Sign in with the account you used to buy Premium.",
  cancel_unavailable: "Cancellation is currently unavailable. Refresh your subscription and try again.",
  promo_invalid: "This code is invalid, expired or already used.",
  promo_rate_limited: "Too many attempts. Wait before trying again.",
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof PremiumRequestError && Object.hasOwn(requestErrors, error.code)
    ? requestErrors[error.code]
    : fallback;
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { dateStyle: "long" }) : null;
}

function planName(plan: string | null) {
  if (isPlanId(plan)) return plan === "lifetime" ? "Founders Edition Lifetime" : `Premium ${premiumPlans[plan].name}`;
  if (plan?.startsWith("promo")) return "Premium · Promo";
  return plan ? "Premium" : "Free";
}

function isPending(state: CheckoutState | undefined) {
  return state === "creating" || state === "open" || state === "unknown";
}

function hasCurrentAccess(subscription: Subscription) {
  return subscription.status === "active"
    || ((subscription.status === "cancelled" || subscription.status === "past_due")
      && subscription.access_until !== null
      && Date.parse(subscription.access_until) > Date.now());
}

export function PremiumAccount() {
  const search = useSearchParams();
  const { checkoutId, plan } = parseAccountQuery(search.toString());
  const [authState, setAuthState] = useState<{ session: Session | null; error?: string } | null>(null);
  const { catalog, loaded } = usePremiumCatalog();

  useEffect(() => {
    let mounted = true;
    const callback = new URLSearchParams(window.location.search);
    const auth = getBrowserAuth();
    if (!auth) {
      queueMicrotask(() => {
        if (mounted) setAuthState({ session: null, error: "Account services are currently unavailable." });
      });
      return () => { mounted = false; };
    }
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "INITIAL_SESSION") {
        const providerError = callback.has("error") || (callback.has("code") && !session);
        let restored = parseAccountQuery(window.location.search);
        try {
          const intent = sessionStorage.getItem(oauthReturnIntent);
          sessionStorage.removeItem(oauthReturnIntent);
          if (intent && (callback.has("code") || callback.has("error"))) {
            if (new URLSearchParams(intent).get("returnTo") === "delete-account") {
              window.location.replace(providerError ? "/delete-account/?error=sign_in_failed" : "/delete-account/");
              return;
            }
            restored = parseAccountQuery(intent);
          }
        } catch {
          // Restoring plan selection is optional.
        }
        const params = new URLSearchParams();
        if (restored.checkoutId) params.set("checkout", restored.checkoutId);
        if (restored.plan) params.set("plan", restored.plan);
        if (window.location.search.slice(1) !== params.toString()) {
          window.history.replaceState(null, "", params.size ? `/account/?${params}` : "/account/");
        }
        setAuthState({
          session,
          error: providerError ? "Sign-in did not complete. Try again or use email." : undefined,
        });
      } else {
        setAuthState({ session });
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  if (!authState) return <p role="status" className="account-muted">Loading your account…</p>;

  if (authState.session) {
    return <SignedInAccount key={authState.session.user.id} session={authState.session} checkoutId={checkoutId} plan={plan} catalog={catalog} catalogLoaded={loaded} />;
  }

  const selected = availablePlans(catalog).find((item) => item.id === plan);
  return (
    <section className="account-auth" aria-labelledby="account-title">
      {selected && <p className="account-selection">Premium {selected.name} · {selected.price} {selected.period}</p>}
      {plan === "lifetime" && loaded && catalog && !selected && <p>Founders Edition is sold out.</p>}
      {authState.error && <p role="alert" className="account-error">{authState.error}</p>}
      {getBrowserAuth() && <AccountSignIn checkoutId={checkoutId} plan={plan} />}
    </section>
  );
}

function SignedInAccount({
  session,
  checkoutId,
  plan,
  catalog,
  catalogLoaded,
}: {
  session: Session;
  checkoutId: string | null;
  plan: PlanId | null;
  catalog: PremiumCatalog | null;
  catalogLoaded: boolean;
}) {
  const [snapshot, setSnapshot] = useState<{ checkoutId: string | null; value?: Subscription; error?: string } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const token = session.access_token;
  const current = snapshot?.checkoutId === checkoutId ? snapshot : null;
  const subscription = current?.value;
  const pending = isPending(subscription?.checkout_state);
  const foundersSoldOut = plan === "lifetime" && catalog && !availablePlans(catalog).some((item) => item.id === plan);
  const canPurchase = subscription && !pending && !hasCurrentAccess(subscription) && !subscription.can_cancel;
  const resumeUrl = subscription?.checkout_state === "open" ? providerCheckoutUrl(subscription.checkout_url) : null;

  useEffect(() => {
    if (busy) return;
    const controller = new AbortController();
    let timer: number | undefined;
    let polling = false;
    const pollUntil = Date.now() + 60_000;

    async function load() {
      if (polling || document.hidden) return;
      window.clearTimeout(timer);
      polling = true;
      try {
        const value = await requestPremium("status", {
          input: checkoutId ? { checkout_id: checkoutId } : {},
          token,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setSnapshot({ checkoutId, value });
        if (isPending(value.checkout_state) && Date.now() < pollUntil) {
          timer = window.setTimeout(load, 4_000);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSnapshot({ checkoutId, error: errorMessage(error, "Could not load your subscription. Try refreshing.") });
        }
      } finally {
        polling = false;
      }
    }

    void load();
    document.addEventListener("visibilitychange", load);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [token, checkoutId, refresh, busy]);

  async function startCheckout(selected: PlanId) {
    if (busy || !catalog?.checkout_enabled) return;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await requestPremium("checkout", { input: { plan: selected }, token });
      const auth = getBrowserAuth();
      const currentSession = await auth?.getSession();
      if (currentSession?.data.session?.user.id !== session.user.id) return;
      const query = new URLSearchParams({ plan: selected, checkout: result.checkout_id });
      window.history.replaceState(null, "", `/account/?${query}`);
      const link = result.checkout_state === "open" ? providerCheckoutUrl(result.checkout_url) : null;
      if (link) {
        window.location.assign(link);
      } else if (result.checkout_state === "open") {
        setFeedback({ error: true, message: "The checkout link is unavailable. Refresh your subscription and try again." });
      }
    } catch (error) {
      setFeedback({ error: true, message: errorMessage(error, "Could not start checkout. Refresh your subscription and try again.") });
    } finally {
      setBusy(false);
    }
  }

  async function manage(action: "cancel" | "redeem" | "signout", event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      if (action === "signout") {
        const auth = getBrowserAuth();
        if (!auth) throw new Error("Auth unavailable");
        const { error } = await auth.signOut({ scope: "local" });
        if (error) throw error;
        return;
      }
      const value = action === "cancel"
        ? await requestPremium("cancel", { token })
        : await requestPremium("redeem", { input: { code: code.trim() }, token });
      setSnapshot({ checkoutId, value });
      setConfirmCancel(false);
      if (action === "redeem") setCode("");
      const message = action === "redeem" ? "Promo code applied."
        : value.can_cancel ? "Cancellation requested. Refresh your status to confirm."
        : "Automatic renewal cancelled.";
      setFeedback({ error: false, message });
    } catch (error) {
      setFeedback({ error: true, message: errorMessage(error, "Could not complete this request. Try again.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="account-panel glass-card" aria-labelledby="subscription-title">
        <div className="account-row">
          <div>
            <h2 id="subscription-title">Subscription</h2>
            {session.user.email && <p className="account-muted account-email">{session.user.email}</p>}
          </div>
          <button className="account-text-button" type="button" disabled={busy} onClick={() => void manage("signout")}>
            Sign out
          </button>
        </div>

        {!current && <p role="status" className="account-muted">Checking your subscription…</p>}
        {current?.error && (
          <>
            <p className="account-error" role="alert">{current.error}</p>
            {checkoutId && <Link href="/account/">View subscription without this checkout</Link>}
          </>
        )}
        {subscription && (
          <>
            <dl className="account-details">
              <div><dt>Plan</dt><dd>{planName(subscription.plan)}</dd></div>
              {subscription.status !== "free" && <div><dt>Status</dt><dd>{statusLabels[subscription.status]}</dd></div>}
              {subscription.next_charge_at && (
                <div><dt>Next charge</dt><dd>{formatDate(subscription.next_charge_at)}</dd></div>
              )}
              {subscription.access_until && (
                <div><dt>Access until</dt><dd>{formatDate(subscription.access_until)}</dd></div>
              )}
            </dl>
            {subscription.checkout_state && (
              <p className="account-status" role="status">
                {subscription.checkout_plan ? `${planName(subscription.checkout_plan)} · ` : ""}
                {checkoutLabels[subscription.checkout_state]}
              </p>
            )}
            {resumeUrl && <a className="btn premium-cta" href={resumeUrl}>Continue to lava.top</a>}
            {subscription.can_cancel && (confirmCancel ? (
              <div className="account-confirm">
                <p>Your access continues until the end of the paid period.</p>
                <div className="account-actions">
                  <button className="btn btn-outline" type="button" disabled={busy} onClick={() => void manage("cancel")}>
                    Confirm cancellation
                  </button>
                  <button className="account-text-button" type="button" disabled={busy} onClick={() => setConfirmCancel(false)}>
                    Keep subscription
                  </button>
                </div>
              </div>
            ) : (
              <button className="account-text-button" type="button" disabled={busy} onClick={() => setConfirmCancel(true)}>
                Cancel automatic renewal
              </button>
            ))}
          </>
        )}
        <button className="account-text-button" type="button" disabled={busy} onClick={() => setRefresh((value) => value + 1)}>
          Refresh status
        </button>
        {feedback && <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "account-error" : "account-status"}>{feedback.message}</p>}
      </section>

      {canPurchase && (
        <>
          {foundersSoldOut && <p className="account-muted" role="status">Founders Edition is sold out.</p>}
          {catalog?.checkout_enabled ? (
            <PremiumPlanCard
              catalog={catalog}
              preferredPlan={plan}
              renderAction={(selected) => (
                <>
                  <p className="account-muted">Premium will be linked to {session.user.email ?? "this account"}.</p>
                  <button
                    type="button"
                    className="btn download-card-btn premium-cta"
                    disabled={busy}
                    onClick={() => void startCheckout(selected.id)}
                  >
                    Continue to lava.top · {selected.price}
                  </button>
                </>
              )}
            />
          ) : catalogLoaded && (
            <p className="account-muted">New purchases are currently unavailable.</p>
          )}
        </>
      )}
      {subscription && canPurchase && (
        <details className="account-panel account-promo">
          <summary>Redeem a promo code</summary>
            <form className="signup-form account-form" onSubmit={(event) => void manage("redeem", event)}>
              <label htmlFor="premium-promo-code">Enter your code</label>
              <input
                id="premium-promo-code"
                className="signup-input"
                autoComplete="off"
                spellCheck={false}
                maxLength={128}
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <button className="signup-submit" type="submit" disabled={busy || !code.trim()}>Apply code</button>
            </form>
        </details>
      )}
      <Link className="account-text-button" href="/delete-account/">Delete account</Link>
    </>
  );
}
