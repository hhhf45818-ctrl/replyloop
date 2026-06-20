"use client";

import { useState } from "react";
import { useReplyloop } from "@/components/ReplyloopProvider";

const MASK = "••••••••••••••••••••••••";

export default function SettingsPage() {
  const {
    user,
    apiKey,
    freshdeskDomain,
    freshdeskKey,
    model,
    threshold,
    setApiKey,
    saveFreshdesk,
    setModel,
    setThreshold,
    resetAll,
    toast,
  } = useReplyloop();

  const [keyInput, setKeyInput] = useState(apiKey ? MASK : "");
  const [fdDomain, setFdDomain] = useState(freshdeskDomain || "");
  const [fdKey, setFdKey] = useState(freshdeskKey ? "••••••••••••••••" : "");
  const [fdStatus, setFdStatus] = useState<{ msg: string; color: string } | null>(
    freshdeskDomain && freshdeskKey
      ? { msg: `✓ Connected to ${freshdeskDomain}`, color: "var(--accent)" }
      : { msg: "Not connected yet", color: "var(--ink-soft)" }
  );

  function saveAnthropic() {
    const val = keyInput.trim();
    if (!val || val.includes("•")) {
      toast("Please enter a valid API key", "error");
      return;
    }
    if (!val.startsWith("sk-")) {
      toast("Invalid API key format — must start with sk-", "error");
      return;
    }
    setApiKey(val);
    setKeyInput(MASK);
    toast("Anthropic API key saved ✓", "success");
  }

  async function testFreshdesk() {
    const domain = fdDomain.trim();
    const key = fdKey.includes("•") ? freshdeskKey : fdKey.trim();
    if (!domain || !key) {
      toast("Please enter your Freshdesk domain and API key first", "error");
      return;
    }
    setFdStatus({ msg: "Testing connection...", color: "var(--ink-mute)" });
    try {
      const res = await fetch("/api/test-freshdesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, key }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setFdStatus({
          msg: `✓ Connected! Logged in as: ${data.name || "Agent"}`,
          color: "var(--accent)",
        });
        toast("Freshdesk connection successful ✓", "success");
      } else {
        setFdStatus({
          msg: `✗ ${data.error || "Connection failed — check your domain and API key"}`,
          color: "var(--danger)",
        });
        toast("Connection failed — check credentials", "error");
      }
    } catch {
      setFdStatus({
        msg: "✗ Could not reach the server",
        color: "var(--danger)",
      });
      toast("Could not test Freshdesk connection", "error");
    }
  }

  async function connectFreshdesk() {
    const domain = fdDomain.trim();
    const key = fdKey.includes("•") ? freshdeskKey : fdKey.trim();
    if (!domain) {
      toast("Please enter your Freshdesk domain", "error");
      return;
    }
    if (!key) {
      toast("Please enter your Freshdesk API key", "error");
      return;
    }
    // Persist locally for the front-end immediately.
    saveFreshdesk(domain, key);
    setFdKey("••••••••••••••••");
    setFdStatus({ msg: "Connecting & registering webhook...", color: "var(--ink-mute)" });
    try {
      const res = await fetch("/api/connect-freshdesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.userId, domain, key }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setFdStatus({
          msg: `✓ ${data.message || `Connected to ${domain}`}`,
          color: "var(--accent)",
        });
        toast("Freshdesk connected ✓", "success");
      } else {
        // Local save still succeeded; surface the backend note.
        setFdStatus({
          msg: `✓ Saved locally. Backend: ${data.error || "not configured"}`,
          color: "var(--warn)",
        });
        toast("Saved locally — backend not fully configured", "error");
      }
    } catch {
      setFdStatus({
        msg: `✓ Connected to ${domain} (saved locally)`,
        color: "var(--accent)",
      });
    }
  }

  function onReset() {
    if (
      !confirm(
        "Are you sure? This will delete all tickets, reset skills to default, and remove all API keys. This cannot be undone."
      )
    )
      return;
    resetAll();
    setKeyInput("");
    setFdDomain("");
    setFdKey("");
    setFdStatus({ msg: "Not connected yet", color: "var(--ink-soft)" });
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--ink-mute)",
    textTransform: "uppercase",
    letterSpacing: ".08em",
    display: "block",
    marginBottom: 6,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid var(--line)",
    borderRadius: "var(--r)",
    padding: "9px 12px",
    fontSize: 13.5,
    color: "var(--ink)",
    background: "var(--bg-card)",
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your API keys and account preferences</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 620 }}>
          {/* API KEYS */}
          <div className="section-label" style={{ marginTop: 0 }}>
            🔑 API Keys
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ fontSize: 14, marginBottom: 4 }}>Anthropic API Key</h3>
                <p style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>
                  Used to power Claude AI replies. Get yours at console.anthropic.com
                </p>
              </div>
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
              >
                Get key →
              </a>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                placeholder="sk-ant-api03-..."
                autoComplete="off"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button className="btn btn-accent" onClick={saveAnthropic}>
                Save
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12 }}>
              {apiKey ? (
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                  ✓ API key saved and active
                </span>
              ) : (
                <span style={{ color: "var(--ink-soft)" }}>No API key saved yet</span>
              )}
            </div>
          </div>

          {/* FRESHDESK */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ fontSize: 14, marginBottom: 4 }}>Freshdesk Connection</h3>
                <p style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>
                  Connect your Freshdesk account to handle real tickets automatically
                </p>
              </div>
              <a
                href="https://freshdesk.com"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
              >
                Freshdesk →
              </a>
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Your Freshdesk Domain</label>
              <input
                type="text"
                placeholder="yourcompany.freshdesk.com"
                value={fdDomain}
                onChange={(e) => setFdDomain(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Freshdesk API Key</label>
              <input
                type="password"
                placeholder="Your Freshdesk API key"
                autoComplete="off"
                value={fdKey}
                onChange={(e) => setFdKey(e.target.value)}
                style={inputStyle}
              />
              <p style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 6 }}>
                Find this in Freshdesk → Profile picture → Profile Settings → API Key (bottom
                right)
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-accent" onClick={connectFreshdesk}>
                Connect Freshdesk
              </button>
              <button className="btn btn-ghost" onClick={testFreshdesk}>
                Test connection
              </button>
            </div>
            {fdStatus && (
              <div style={{ marginTop: 10, fontSize: 12 }}>
                <span style={{ color: fdStatus.color, fontWeight: 600 }}>{fdStatus.msg}</span>
              </div>
            )}
          </div>

          {/* SHOPIFY — coming soon */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 4 }}>
                Shopify Connection{" "}
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    background: "var(--warn-pale)",
                    color: "var(--warn)",
                    borderRadius: 20,
                    fontWeight: 600,
                    marginLeft: 4,
                  }}
                >
                  Coming soon
                </span>
              </h3>
              <p style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>
                Connect Shopify so the bot can check real order status, inventory, and customer
                data
              </p>
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Shopify Store URL</label>
              <input
                type="text"
                placeholder="yourstore.myshopify.com"
                disabled
                style={{ ...inputStyle, color: "var(--ink-soft)", background: "var(--bg-soft)" }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Shopify Access Token</label>
              <input
                type="password"
                placeholder="shpat_..."
                disabled
                style={{ ...inputStyle, color: "var(--ink-soft)", background: "var(--bg-soft)" }}
              />
            </div>
            <button className="btn btn-ghost" disabled style={{ opacity: 0.5 }}>
              Connect Shopify (coming soon)
            </button>
          </div>

          {/* REPLY SETTINGS */}
          <div className="section-label">⚙️ Reply Settings</div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 14 }}>AI Model</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="model"
                  value="claude-sonnet-4-20250514"
                  checked={model === "claude-sonnet-4-20250514"}
                  onChange={(e) => {
                    setModel(e.target.value);
                    toast("AI model updated ✓", "success");
                  }}
                  style={{ accentColor: "var(--accent)" }}
                />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                    Claude Sonnet — Best quality
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                    Recommended for complex emails and complaints · ~$0.0075/email
                  </div>
                </div>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="model"
                  value="claude-haiku-4-5-20251001"
                  checked={model === "claude-haiku-4-5-20251001"}
                  onChange={(e) => {
                    setModel(e.target.value);
                    toast("AI model updated ✓", "success");
                  }}
                  style={{ accentColor: "var(--accent)" }}
                />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                    Claude Haiku — Fast & affordable
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                    Good for simple FAQ emails · ~$0.002/email
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 14 }}>Auto-send threshold</h3>
            <p style={{ fontSize: 12.5, color: "var(--ink-mute)", marginBottom: 14 }}>
              Replies above this confidence score are sent automatically. Below it → saved as
              draft for human review.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <input
                type="range"
                min={50}
                max={95}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                style={{ flex: 1, accentColor: "var(--accent)" }}
              />
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--ink)",
                  minWidth: 40,
                }}
              >
                {threshold}%
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--ink-soft)",
                marginTop: 6,
              }}
            >
              <span>50% — send more automatically</span>
              <span>95% — send less, more human review</span>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="section-label">🗑️ Danger Zone</div>
          <div className="card" style={{ borderColor: "#FECACA" }}>
            <h3 style={{ fontSize: 14, marginBottom: 6, color: "var(--danger)" }}>
              Reset all data
            </h3>
            <p style={{ fontSize: 12.5, color: "var(--ink-mute)", marginBottom: 14 }}>
              Clears all tickets, resets skills to default, and removes all API keys. Cannot be
              undone.
            </p>
            <button className="btn btn-danger" onClick={onReset}>
              Reset everything
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
