import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS. Server-only: used by the
 * checkout pipeline (stock decrement), Razorpay webhook/verify (mark paid),
 * refunds, and transactional-email order lookups. Never import from client
 * components.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Fail closed for production operations that must never use an anon/session client. */
export function requireServiceClient() {
  const client = createServiceClient();
  if (!client) {
    throw new Error(
      "SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) is required for this server operation.",
    );
  }
  return client;
}
