import type { Metadata } from "next";
import { AccountDeletion } from "@/components/account-deletion";
import "../account/account.css";

export const metadata: Metadata = {
  title: "Delete your GOD Mode account",
  referrer: "no-referrer",
};

export default function DeleteAccountPage() {
  return <main className="account-page account-page--deletion">
    <h1 id="deletion-title">Delete account</h1>
    <AccountDeletion />
    <p className="account-muted account-support"><a href="mailto:support.godmode@gmail.com">Contact support</a></p>
  </main>;
}
