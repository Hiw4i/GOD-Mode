"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { availablePlans, FOUNDERS_LIMIT, type PlanId, type PremiumCatalog } from "@/lib/premium-model";
import { premiumFeatures } from "@/lib/content";

type CatalogPlan = ReturnType<typeof availablePlans>[number];

export function PremiumPlanCard({
  catalog,
  preferredPlan,
  headingAs: Heading = "h2",
  renderAction,
}: {
  catalog: PremiumCatalog | null;
  preferredPlan?: PlanId | null;
  headingAs?: "h2" | "h3";
  renderAction: (plan: CatalogPlan) => ReactNode;
}) {
  const groupId = useId();
  const [selection, setSelection] = useState<PlanId | null>(null);
  const plans = availablePlans(catalog);
  const selected = plans.find((plan) => plan.id === (selection ?? preferredPlan))
    ?? plans.find((plan) => plan.id === "yearly")
    ?? plans[0];

  if (!selected) return null;

  const monthly = plans.find((plan) => plan.id === "monthly");
  const savings = monthly ? Math.floor(100 * (1 - selected.price_minor / (12 * monthly.price_minor))) : 0;
  const founder = selected.id === "lifetime";
  const foundersSold = Math.min(FOUNDERS_LIMIT, Math.max(0, catalog?.founders_sold ?? 0));

  return (
    <article className="download-card glass-card download-card--premium" aria-label="Premium plans">
      <Heading className="download-card-title">Premium</Heading>
      <div
        className="premium-toggle"
        role="radiogroup"
        aria-label="Choose billing period"
        style={{ "--plan-count": plans.length, "--plan-index": plans.indexOf(selected) } as CSSProperties}
      >
        {plans.map((plan) => (
          <label className={`premium-toggle-btn${selected.id === plan.id ? " is-selected" : ""}`} key={plan.id}>
            <input
              type="radio"
              name={groupId}
              value={plan.id}
              checked={selected.id === plan.id}
              aria-controls={`${groupId}-detail`}
              onChange={() => setSelection(plan.id)}
            />
            <span>{plan.label}</span>
          </label>
        ))}
      </div>
      <div id={`${groupId}-detail`} aria-live="polite">
        <div className="download-card-price premium-price" key={selected.id}>
          <span className="price-amount">{selected.price}</span>
          <span className="price-period">{selected.period}</span>
        </div>
        <div className={`download-card-claim-bar${founder ? "" : " is-hidden"}`} aria-hidden="true">
          <span style={founder ? { width: `${100 * foundersSold / FOUNDERS_LIMIT}%` } : undefined} />
        </div>
        {founder ? (
          <p className="download-card-promotion">Founders Edition · {foundersSold}/{FOUNDERS_LIMIT} claimed</p>
        ) : selected.id === "yearly" && savings > 0 ? (
          <p className="download-card-promotion">Save {savings}% compared with monthly</p>
        ) : (
          <p className="download-card-promotion is-placeholder" aria-hidden="true">&nbsp;</p>
        )}
        <ul className="download-card-features premium-features">
          {[...premiumFeatures, founder ? "One-time payment" : "Renews automatically · Cancel anytime"].map((label) => (
            <li key={label}>
              <span className="feature-check" aria-hidden="true">✓</span>
              {label}
            </li>
          ))}
        </ul>
      </div>
      {renderAction(selected)}
    </article>
  );
}
