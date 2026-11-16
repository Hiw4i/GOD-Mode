import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { premiumConfig } from "./premium-api";

let client: SupabaseClient | undefined;

export function getBrowserAuth() {
  const config = premiumConfig();
  if (typeof window === "undefined" || !config) return null;
  client ??= createClient(config.origin, config.key, {
    auth: { flowType: "pkce", detectSessionInUrl: true },
  });
  return client.auth;
}
