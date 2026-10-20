import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/** Set once the user has finished (or skipped) onboarding. */
export const ONBOARDING_SEEN_KEY = "@onboardingSeen";

/**
 * Returns the current session, signing in anonymously if there is none.
 * Never throws: when offline (or Supabase is unreachable) it returns null and
 * the app keeps working on local data; the next launch tries again.
 */
export async function ensureSession(): Promise<Session | null> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;

    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn("Anonymous sign-in failed:", error.message);
      return null;
    }
    return anon.session;
  } catch (e) {
    console.warn("Session check failed:", e);
    return null;
  }
}

/** True for anonymous users (no email linked yet) and when there is no session at all. */
export function isAnonymous(session: Session | null): boolean {
  return !session || session.user.is_anonymous === true;
}

/**
 * Signs a linked (email) account out and wipes all local app data, so the next
 * person on this device starts fresh. Supabase's own session keys go with signOut().
 */
export async function signOutAndClearLocalData(): Promise<void> {
  await supabase.auth.signOut();
  const keys = await AsyncStorage.getAllKeys();
  // Supabase stores its session under "sb-<project>-auth-token"; signOut() already removed it.
  await AsyncStorage.multiRemove(keys.filter((k) => !k.startsWith("sb-")));
}

/** The current session, kept up to date via Supabase's auth events. */
export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return session;
}

export type UpgradeResult = "linked" | "confirm_email";

/**
 * Turns the current anonymous user into a regular account by adding email and
 * password to the SAME user ID (unlike signUp, which would create a new user).
 * Returns "confirm_email" when Supabase requires the address to be confirmed
 * first (email confirmation enabled); the password is then set after confirming.
 */
export async function upgradeAnonymousAccount(
  email: string,
  password: string,
  name?: string,
): Promise<UpgradeResult> {
  const session = await ensureSession();
  if (!session) throw new Error("No connection. Please check your internet and try again.");
  if (!isAnonymous(session)) throw new Error("You already have an account.");

  const { data, error } = await supabase.auth.updateUser({
    email,
    data: name ? { name } : undefined,
  });
  if (error) throw new Error(friendlyAuthError(error.code, error.message));

  // With email confirmation disabled the address applies immediately; otherwise
  // it waits in new_email until the user clicks the confirmation link.
  if (data.user?.email?.toLowerCase() !== email.toLowerCase()) return "confirm_email";

  const { error: pwError } = await supabase.auth.updateUser({ password });
  if (pwError) throw new Error(friendlyAuthError(pwError.code, pwError.message));
  return "linked";
}

function friendlyAuthError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "email_exists":
      return "This email already belongs to an account. Log in instead.";
    case "weak_password":
      return "Please choose a stronger password (at least 6 characters).";
    case "email_address_invalid":
      return "This email address doesn't look valid.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return fallback;
  }
}
