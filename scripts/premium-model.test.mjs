import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseAccountQuery,
  providerCheckoutUrl,
  availablePlans,
} from "../lib/premium-model.ts";

test("checkout return trusts only the local UUID for a server status lookup", () => {
  const id = "db89048d-2820-498b-9fcb-8900ece2b098";
  assert.deepEqual(
    parseAccountQuery(`?checkout=${id}&invoiceId=external&status=success&plan=yearly`),
    { checkoutId: id, plan: "yearly" },
  );
  assert.deepEqual(
    parseAccountQuery("?checkout=other&invoiceId=external&status=success&plan=wrong"),
    { checkoutId: null, plan: null },
  );
});

test("checkout redirects only to HTTPS lava.top without user info or a custom port", () => {
  assert.equal(providerCheckoutUrl("https://app.lava.top/checkout"), "https://app.lava.top/checkout");
  for (const url of [
    "https://lava.top.example.com/checkout",
    "https://evil-lava.top/checkout",
    "http://lava.top/checkout",
    "https://app.lava.top:8443/checkout",
    "https://username@app.lava.top/checkout",
    "//lava.top/checkout",
    "javascript:alert(1)",
  ]) assert.equal(providerCheckoutUrl(url), null);
});

test("catalog sets displayed USD prices and removes Lifetime when unavailable", () => {
  const catalog = {
    plans: [
      { id: "yearly", price_minor: 2900, currency: "USD" },
      { id: "monthly", price_minor: 500, currency: "USD" },
    ],
    founders_sold: 100,
    checkout_enabled: true,
  };
  assert.deepEqual(
    availablePlans(catalog).map(({ id, price }) => [id, price]),
    [["monthly", "$5"], ["yearly", "$29"]],
  );
  assert.deepEqual(availablePlans(null), []);
  const staleOffer = { id: "lifetime", price_minor: 4900, currency: "USD" };
  assert.deepEqual(
    availablePlans({ ...catalog, plans: [staleOffer, ...catalog.plans] }).map(({ id }) => id),
    ["monthly", "yearly"],
  );
});
