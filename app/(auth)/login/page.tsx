"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { findAccount, getSession, setSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in → straight to the app.
  useEffect(() => {
    if (getSession()) router.replace("/dashboard");
  }, [router]);

  function login() {
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    // Simulate loading (matches original 800ms feel).
    setTimeout(() => {
      const account = findAccount(email, password);
      if (account) {
        setSession(account);
        router.push("/dashboard");
      } else {
        setLoading(false);
        setError("Invalid email or password. Please try again.");
        setPassword("");
      }
    }, 800);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") login();
  }

  return (
    <div className="auth-body" onKeyDown={onKeyDown}>
      <div className="logo-wrap">
        <div className="logo-icon">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <span className="logo-name">Replyloop</span>
      </div>

      <div className="auth-card">
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <span className="badge-beta">
            <span className="badge-dot" />
            Beta access
          </span>
        </div>
        <h1>Welcome back</h1>
        <p>Sign in to your Replyloop account to manage your AI support replies</p>

        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>Email address</label>
          <input
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="btn-login" onClick={login} disabled={loading}>
          Sign in →
        </button>

        {loading && (
          <div className="loading">
            <div className="spinner-sm" />
            <span>Signing in...</span>
          </div>
        )}

        <hr className="divider" />

        <div className="hint">
          <strong>Beta test accounts</strong>
          <br />
          Contact the admin to get your login credentials
        </div>
      </div>
    </div>
  );
}
