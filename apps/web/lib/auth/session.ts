import { createClient } from '@/lib/supabase/server';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

export async function checkSessionTimeout() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return { valid: false, reason: 'no_session' };

  const expiresAt = new Date(session.expires_at! * 1000);
  const now = new Date();
  const timeRemaining = expiresAt.getTime() - now.getTime();

  if (timeRemaining <= 0) {
    return { valid: false, reason: 'expired' };
  }

  if (timeRemaining < SESSION_REFRESH_MS) {
    // Auto-refresh session
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      return { valid: false, reason: 'refresh_failed' };
    }
  }

  return { valid: true, expiresIn: timeRemaining };
}

export async function extendSession() {
  const supabase = await createClient();
  const { error } = await supabase.auth.refreshSession();
  return { success: !error };
}
