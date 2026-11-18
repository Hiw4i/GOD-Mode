import type { Checkout, PlanId, PremiumCatalog, Subscription } from "./premium-model";

type Requests = {
  catalog: { input?: never; output: PremiumCatalog };
  status: { input: { checkout_id?: string }; output: Subscription };
  checkout: { input: { plan: PlanId }; output: Checkout };
  cancel: { input?: never; output: Subscription };
  redeem: { input: { code: string }; output: Subscription };
  delete_account: { input: { confirmed: true }; output: { result: "deleted" } };
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function premiumConfig() {
  if (!url || !key?.startsWith("sb_publishable_")) return null;
  try {
    const origin = new URL(url);
    const isLocal = origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
    if (origin.protocol !== "https:" && !(isLocal && origin.protocol === "http:")) return null;
    if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) return null;
    return { origin: origin.origin, key };
  } catch {
    return null;
  }
}

export class PremiumRequestError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "PremiumRequestError";
  }
}

export async function requestPremium<Action extends keyof Requests>(
  action: Action,
  { input, token, signal }: { input?: Requests[Action]["input"]; token?: string; signal?: AbortSignal } = {},
): Promise<Requests[Action]["output"]> {
  const config = premiumConfig();
  if (!config) throw new PremiumRequestError("not_configured");
  const timeout = AbortSignal.timeout(15_000);
  const response = await fetch(`${config.origin}/functions/v1/premium`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      apikey: config.key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...input }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    throw new PremiumRequestError(typeof body?.error === "string" ? body.error : "temporary_failure");
  }
  return body;
}
