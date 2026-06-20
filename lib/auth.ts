// ════════════════════════════════════════════════════════════════
// Beta auth (client-side, sessionStorage) — ported from index.html.
// Two hardcoded beta accounts. No public signup.
//
// Each beta account maps to a stable UUID used as user_id for any
// Supabase-backed records created on their behalf.
// ════════════════════════════════════════════════════════════════

export interface BetaAccount {
  email: string;
  password: string;
  name: string;
  userId: string;
}

export const ACCOUNTS: BetaAccount[] = [
  {
    email: "beta1@replyloop.app",
    password: "Beta2024#Rply!",
    name: "Beta Tester 1",
    userId: "00000000-0000-4000-8000-000000000001",
  },
  {
    email: "beta2@replyloop.app",
    password: "Test2024#Loop!",
    name: "Beta Tester 2",
    userId: "00000000-0000-4000-8000-000000000002",
  },
];

export interface SessionUser {
  email: string;
  name: string;
  userId: string;
  loggedIn: true;
}

const SESSION_KEY = "rl_user";

export function findAccount(email: string, password: string): BetaAccount | undefined {
  const e = email.trim().toLowerCase();
  return ACCOUNTS.find((a) => a.email === e && a.password === password);
}

export function setSession(account: BetaAccount): void {
  const user: SessionUser = {
    email: account.email,
    name: account.name,
    userId: account.userId,
    loggedIn: true,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
