export const premiumPlans = {
  monthly: { name: "Monthly", period: "/ month", label: "month" },
  yearly: { name: "Yearly", period: "/ year", label: "year" },
  lifetime: { name: "Lifetime", period: "once", label: "lifetime" },
} as const;

export const FOUNDERS_LIMIT = 100;

export type PlanId = keyof typeof premiumPlans;

export interface PremiumCatalog {
  plans: { id: PlanId; price_minor: number; currency: "USD" }[];
  founders_sold: number;
  checkout_enabled: boolean;
}

export type CheckoutState = "creating" | "open" | "unknown" | "paid" | "closed";

export interface Subscription {
  plan: string | null;
  status: "free" | "active" | "cancelled" | "past_due" | "expired" | "revoked";
  access_until: string | null;
  next_charge_at: string | null;
  can_cancel: boolean;
  checkout_state?: CheckoutState;
  checkout_id?: string;
  checkout_plan?: PlanId;
  checkout_url?: string;
}

export interface Checkout {
  checkout_id: string;
  checkout_url?: string;
  checkout_state: CheckoutState;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const checkoutIdPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export function isPlanId(value: string | null): value is PlanId {
  return value !== null && Object.hasOwn(premiumPlans, value);
}

export function parseAccountQuery(query: string) {
  const params = new URLSearchParams(query);
  const checkoutId = params.get("checkout");
  const plan = params.get("plan");
  return {
    checkoutId: checkoutId && checkoutIdPattern.test(checkoutId) ? checkoutId : null,
    plan: isPlanId(plan) ? plan : null,
  };
}

export function providerCheckoutUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.username && !url.password && !url.port
      && (url.hostname === "lava.top" || url.hostname.endsWith(".lava.top"))
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function availablePlans(catalog: PremiumCatalog | null) {
  const ids: PlanId[] = ["monthly", "yearly", "lifetime"];
  return ids.flatMap((id) => {
    if (id === "lifetime" && catalog && catalog.founders_sold >= FOUNDERS_LIMIT) return [];
    const plan = catalog?.plans.find((value) => value.id === id);
    if (!plan || plan.currency !== "USD" || !Number.isSafeInteger(plan.price_minor) || plan.price_minor <= 0) {
      return [];
    }
    return [{ ...premiumPlans[id], ...plan, price: usd.format(plan.price_minor / 100) }];
  });
}
