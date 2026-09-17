"use client";

import { useState } from "react";
import type { DownloadPlan } from "@/lib/content";

export function DownloadPlanSelector({ plans }: { plans: readonly DownloadPlan[] }) {
  const [selectedId, setSelectedId] = useState<DownloadPlan["id"]>("yearly");

  return (
    <div className="download-plan-selector">
      <div className="download-plan-tabs" role="tablist" aria-label="Choose a plan">
        {plans.map((plan) => {
          const selected = plan.id === selectedId;
          return (
            <button
              key={plan.id}
              className={`download-plan-tab${selected ? " is-selected" : ""}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`download-plan-${plan.id}`}
              onClick={() => setSelectedId(plan.id)}
            >
              <span>{plan.title}</span>
              <strong>{plan.price}</strong>
            </button>
          );
        })}
      </div>

      <div className="download-cards">
        {plans.map((plan) => (
          <article
            key={plan.id}
            id={`download-plan-${plan.id}`}
            className={`download-card glass-card download-card--${plan.id}${plan.id === selectedId ? " is-selected" : ""}`}
            data-hover-target
            role="tabpanel"
            aria-label={`${plan.title} plan`}
          >
            <h3 className="download-card-title">{plan.title}</h3>
            <div className="download-card-price"><span className="price-amount">{plan.price}</span>{plan.period && <span className="price-period">{plan.period}</span>}</div>
            {plan.id !== "yearly" && plan.id !== "lifetime" && <div className="download-card-divider" aria-hidden="true" />}
            {plan.promotion && <p className="download-card-promotion">{plan.promotion}</p>}
            {plan.claimed && <><div className="download-card-claim-bar" aria-hidden="true"><span /></div><p className="download-card-promotion">{plan.claimed}</p></>}
            <p className="download-card-plan-name">{plan.planName}</p>
            <ul className="download-card-features">{plan.features.map((item) => <li key={item}><span className="feature-check">✓</span>{item}</li>)}</ul>
            <a href="#download" className={`btn download-card-btn${plan.id === "free" ? " btn-outline" : ""}`} data-open-modal={plan.action}>{plan.cta}</a>
          </article>
        ))}
      </div>
    </div>
  );
}
