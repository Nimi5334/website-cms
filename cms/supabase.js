/**
 * Supabase client + thin helpers for accounts and per-user site storage.
 *
 * Loaded as a plain ES module (no build step, no bundler) — the SDK itself
 * comes from a pinned esm.sh CDN URL so the whole project stays a static
 * site deployable as-is on Vercel.
 *
 * Data model: one row per signed-in user in the `sites` table
 * (user_id uuid primary key, site_json jsonb), protected by Row Level
 * Security so a user can only ever read/write their own row. See
 * company/ or the project plan for the exact SQL.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabaseReady = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = supabaseReady
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthChange(cb) {
  if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => cb(session));
}

export function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}
export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}
export function signOut() {
  return supabase.auth.signOut();
}
export function updatePassword(newPassword) {
  return supabase.auth.updateUser({ password: newPassword });
}

/** Returns the saved site_json for this user, or null if they have no row yet. */
export async function fetchSite(userId) {
  const { data, error } = await supabase
    .from("sites")
    .select("site_json")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.site_json ?? null;
}

/** Creates or updates this user's single site row. */
export async function upsertSite(userId, siteJson) {
  const { error } = await supabase
    .from("sites")
    .upsert({ user_id: userId, site_json: siteJson }, { onConflict: "user_id" });
  if (error) throw error;
}
