import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/env";

/**
 * Cliente de Supabase con service role key.
 *
 * SOLO servidor: este modulo importa `server-only`, asi que cualquier intento de
 * importarlo desde un Client Component rompe la compilacion. Usalo desde Server
 * Components, Server Actions y Route Handlers.
 */

// Cache en globalThis para no crear un cliente nuevo en cada recarga de HMR.
const globalForSupabase = globalThis as typeof globalThis & {
  __emerSupabase?: SupabaseClient;
};

export function getSupabase(): SupabaseClient {
  if (globalForSupabase.__emerSupabase) return globalForSupabase.__emerSupabase;

  const env = getEnv();

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: { schema: "public" },
    global: {
      headers: { "X-Client-Info": "emer-admin" },
    },
  });

  globalForSupabase.__emerSupabase = client;
  return client;
}
