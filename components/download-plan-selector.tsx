"use client";

import { useId, useState } from "react";
import type { DownloadPlan } from "@/lib/content";

type PremiumId = Exclude<DownloadPlan["id"], "free">;

const PREMIUM_ORDER: readonly PremiumId[] = ["monthly", "yearly", "lifetime"];

export function DownloadPlanSelector({ plans }: { plans: readonly DownloadPlan[] }) {
  const freePlan = plans.find((plan) => plan.id === "free");
  const premiumPlans = PREMIUM_ORDER.map((id) => plans.find((plan) => plan.id === id)).filter(
    (plan): plan is DownloadPlan => plan !== undefined,
  );
  const [premiumId, setPremiumId] = useState<PremiumId>("yearly");
  const groupId = useId();

  const selectedPremium = premiumPlans.find((plan) => plan.id === premiumId) ?? premiumPlans[1] ?? premiumPlans[0];

  return (
    <div className="download-plan-selector">
      <div className="download-cards download-cards--unified">
        {freePlan && (
          <article
            key={freePlan.id}
            id="download-plan-free"
            className="download-card glass-card download-card--free"
            data-hover-target
            aria-label={`${freePlan.title} plan`}
          >
            <h3 className="download-card-title">{freePlan.title}</h3>
            <div className="download-card-price">
              <span className="price-amount">{freePlan.price}</span>
              {freePlan.period && <span className="price-period">{freePlan.period}</span>}
            </div>
            <div className="download-card-divider" aria-hidden="true" />
            <p className="download-card-plan-name">{freePlan.planName}</p>
            <ul className="download-card-features">
              {freePlan.features.map((item) => (
                <li key={item}>
                  <span className="feature-check" aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="#download"
              className="btn download-card-btn btn-outline"
              data-open-modal={freePlan.action}
            >
              {freePlan.cta}
            </a>
          </article>
        )}

        {selectedPremium && (
          <article
            id="download-plan-premium"
            className="download-card glass-card download-card--premium"
            data-hover-target
            aria-label="Premium plan"
          >
            <h3 className="download-card-title">Premium</h3>

            <div
              className="premium-toggle"
              role="radiogroup"
              aria-label="Choose billing period"
            >
              {premiumPlans.map((plan) => {
                const selected = plan.id === selectedPremium.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-controls={`${groupId}-premium-detail`}
                    className={`premium-toggle-btn${selected ? " is-selected" : ""}`}
                    onClick={() => setPremiumId(plan.id as PremiumId)}
                  >
                    {plan.id === "monthly" && "month"}
                    {plan.id === "yearly" && "year"}
                    {plan.id === "lifetime" && "lifetime"}
                  </button>
                );
              })}
            </div>

            <div id={`${groupId}-premium-detail`} aria-live="polite">
              <div className="download-card-price premium-price" key={selectedPremium.id}>
                <span className="price-amount">{selectedPremium.price}</span>
                {selectedPremium.period && (
                  <span className="price-period">{selectedPremium.period}</span>
                )}
              </div>
              <div
                className={`download-card-claim-bar${selectedPremium.claimed ? "" : " is-hidden"}`}
                aria-hidden="true"
              >
                <span />
              </div>
              {selectedPremium.promotion ?? selectedPremium.claimed ? (
                <p className="download-card-promotion">
                  {selectedPremium.promotion ?? selectedPremium.claimed}
                </p>
              ) : (
                <p className="download-card-promotion is-placeholder" aria-hidden="true">
                  &nbsp;
                </p>
              )}
              <ul className="download-card-features premium-features">
                {selectedPremium.features.map((item) => {
                  const label =
                    item === "Cancel anytime" && selectedPremium.id === "lifetime"
                      ? "No subscriptions"
                      : item;
                  return (
                    <li key={item}>
                      <span className="feature-check" aria-hidden="true">✓</span>
                      {label}
                    </li>
                  );
                })}
              </ul>
            </div>

            <a
              href="#download"
              className="btn download-card-btn premium-cta"
              data-open-modal={selectedPremium.action}
              aria-label={`Get premium, ${selectedPremium.title} ${selectedPremium.price}`}
            >
              Get {selectedPremium.title} · {selectedPremium.price}
            </a>
            <p className="premium-note">Secure checkout</p>
          </article>
        )}
      </div>
    </div>
  );
}
