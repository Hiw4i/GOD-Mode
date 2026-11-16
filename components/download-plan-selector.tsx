"use client";

import Link from "next/link";
import type { DownloadPlan } from "@/lib/content";
import { PremiumPlanCard } from "./premium-plan-card";
import { usePremiumCatalog } from "./use-premium-catalog";

export function DownloadPlanSelector({ freePlan }: { freePlan: DownloadPlan }) {
  const { catalog, loaded } = usePremiumCatalog();

  return (
    <div className="download-plan-selector">
      <div className="download-cards download-cards--unified">
        <article
          id="download-plan-free"
          className="download-card glass-card download-card--free"
          data-hover-target
          aria-label={`${freePlan.title} plan`}
        >
          <h3 className="download-card-title">{freePlan.title}</h3>
          <div className="download-card-price"><span className="price-amount">{freePlan.price}</span></div>
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
          <a href="#download" className="btn download-card-btn btn-outline" data-open-modal="download">
            {freePlan.cta}
          </a>
        </article>
        {catalog?.plans.length ? (
          <PremiumPlanCard
            catalog={catalog}
            headingAs="h3"
            renderAction={(plan) => (
              <>
                {catalog.checkout_enabled ? (
                  <Link href={`/account/?plan=${plan.id}`} className="btn download-card-btn premium-cta">
                    Get {plan.name} · {plan.price}
                  </Link>
                ) : (
                  <p className="premium-note">New purchases are currently unavailable.</p>
                )}
                <Link href="/account/" className="premium-account-link">Already have Premium? Manage your account</Link>
              </>
            )}
          />
        ) : (
          <article className="download-card glass-card download-card--premium">
            <h3 className="download-card-title">Premium</h3>
            <p className="premium-note" role="status">{loaded ? "Plans are currently unavailable." : "Loading plans…"}</p>
            <Link href="/account/" className="premium-account-link">Manage your account</Link>
          </article>
        )}
      </div>
    </div>
  );
}
