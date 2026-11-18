import type { Metadata } from "next";
import Link from "next/link";
import "../account/account.css";

export const metadata: Metadata = { title: "GOD Mode Privacy Policy" };

export default function PrivacyPage() {
  return <main className="account-page account-page--policy">
    <h1>GOD Mode Privacy Policy</h1>
    <section className="account-policy-section" aria-labelledby="profile-data-title">
      <h2 id="profile-data-title">Account and sync</h2>
      <p>You can use local focus features without an account. If you sign in, GOD Mode uses your email address and account ID to sign you in and keep your cloud profile connected to your devices. That profile can include your tasks, focus sessions, progress, rewards and wallet entries.</p>
      <p>Supabase provides sign-in and cloud storage. PowerSync transfers profile changes to your devices. If you choose Google or GitHub, that provider handles its part of the sign-in. The website uses browser storage to remember your session and keep track of your sign-in.</p>
    </section>
    <section className="account-policy-section" aria-labelledby="blocker-data-title">
      <h2 id="blocker-data-title">App blocking</h2>
      <p>GOD Mode uses the list of launchable apps on your device to build your blocklist. While blocking is enabled, GOD Mode checks the foreground app’s identifier to enforce that list during a focus session. On Android this uses the optional Accessibility service. GOD Mode does not collect screen text, screenshots or keystrokes through the service.</p>
      <p>If you turn on <strong>Sync App Lockout statistics</strong>, GOD Mode saves the app identifier, date, platform and blocking result to your account. You can turn this off in Focus settings on each device. Turning it off stops new collection and clears events waiting to upload. You can keep using the blocker.</p>
    </section>
    <section className="account-policy-section" aria-labelledby="payment-data-title">
      <h2 id="payment-data-title">Premium payments</h2>
      <p>When you start checkout, GOD Mode sends your account email and selected plan to lava.top. You enter payment details on lava.top. GOD Mode uses payment references, amounts, subscription state and access dates to activate Premium and reconcile payments, refunds and disputes.</p>
    </section>
    <section className="account-policy-section" aria-labelledby="deletion-title">
      <h2 id="deletion-title">Security and deletion</h2>
      <p>GOD Mode transmits cloud data over encrypted connections and restricts access to your cloud profile to your signed-in account. Cloud profile data, including uploaded blocking statistics, stays with your account until you delete it. For settled payments, GOD Mode keeps limited records for accounting, refunds, disputes and fraud prevention after removing the account link. Local data and backup files stay on the devices where you saved them.</p>
      <p><Link href="/delete-account/">Delete your GOD Mode account</Link> or contact <a href="mailto:support.godmode@gmail.com">support.godmode@gmail.com</a> for privacy and data requests.</p>
    </section>
  </main>;
}
