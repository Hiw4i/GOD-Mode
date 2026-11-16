import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PremiumAccount } from "@/components/premium-account";
import "./account.css";

export const metadata: Metadata = {
  title: "GOD Mode Account",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AccountPage() {
  return (
    <main className="account-page">
      <Link className="account-back" href="/"><ArrowLeft aria-hidden="true" size={18} /> GOD Mode</Link>
      <h1>Account</h1>
      <Suspense fallback={<p role="status" className="account-muted">Loading your account…</p>}>
        <PremiumAccount />
      </Suspense>
    </main>
  );
}
