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
