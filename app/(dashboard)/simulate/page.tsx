"use client";

import { useState } from "react";
import Link from "next/link";
import { useReplyloop } from "@/components/ReplyloopProvider";
import { MailIcon, PlayIcon, LoopIcon } from "@/components/icons";
import {
  buildSystemPrompt,
  buildUserMessage,
  matchSkill,
} from "@/lib/replyEngine";
import {
  SAMPLES,
  RANDOM_POOL,
  FIRST_NAMES,
  LAST_NAMES,
  DOMAINS,
} from "@/lib/sampleData";
import type { Ticket } from "@/lib/types";

interface SimResult {
  name: string;
  email: string;
  subject: string;
  body: string;
  reply: string;
  skillName: string;
  confidence: number;
  escalated: boolean;
}

const LOADING_STEPS = [
  "Reading email and matching skill...",
  "Searching your skills library...",
  "Replyloop is drafting a reply...",
  "Finishing up...",
];

export default function SimulatePage() {
  const { apiKey, model, skills, addTicket, bumpSkillUsage, toast } = useReplyloop();

  const [name, setName] = useState("Sarah Johnson");
  const [email, setEmail] = useState("sarah@example.com");
  const [subject, setSubject] = useState("I want to return my order");
  const [body, setBody] = useState(
    "Hi, I bought a jacket from your store last week but it doesn't fit. I'd like to return it and get a refund. Can you help me with this? Order #12345."
  );

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_STEPS[0]);
  const [result, setResult] = useState<SimResult | null>(null);
  const [editedReply, setEditedReply] = useState("");

  function loadSample(type: keyof typeof SAMPLES) {
    const s = SAMPLES[type];
    if (!s) return;
    setName(s.name);
    setEmail(s.email);
    setSubject(s.subject);
    setBody(s.body);
    setResult(null);
  }

  function generateRandom() {
    if (Math.random() < 0.7) {
      const s = RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
      setName(s.name);
      setEmail(s.email);
      setSubject(s.subject);
      setBody(s.body);
    } else {
      const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
      const s = RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
      setName(`${first} ${last}`);
      setEmail(`${first.toLowerCase()}.${last.toLowerCase()}@${domain}`);
      setSubject(s.subject);
      setBody(s.body.replace(/^Hi.+?,/, "Hi,"));
    }
    setResult(null);
    toast("Random email generated");
  }

  async function runSimulation() {
    if (!apiKey) {
      toast("Add your API key in Settings first", "error");
      return;
    }
    const activeSkills = skills.filter((s) => s.active);
    if (activeSkills.length === 0) {
      toast("Add at least one active skill first", "error");
      return;
    }
    const subj = subject.trim();
    const bod = body.trim();
    if (!subj || !bod) {
      toast("Please fill in the email subject and body", "error");
      return;
    }

    const custName = name.trim() || "Customer";
    const custEmail = email.trim() || "customer@example.com";

    setResult(null);
    setLoading(true);
    setLoadingText(LOADING_STEPS[0]);

    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      stepIdx++;
      if (stepIdx < LOADING_STEPS.length) setLoadingText(LOADING_STEPS[stepIdx]);
    }, 1200);

    try {
      const systemPrompt = buildSystemPrompt(activeSkills);
      const userMsg = buildUserMessage({
        name: custName,
        email: custEmail,
        subject: subj,
        body: bod,
      });

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: model || "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userMsg }],
        }),
      });

      clearInterval(stepTimer);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const replyText: string = data.content?.[0]?.text || "";

      const isEscalated = replyText.startsWith("[ESCALATE]");
      const cleanReply = replyText.replace("[ESCALATE]", "").trim();

      const matched = matchSkill(activeSkills, subj, bod);
      const confidence = isEscalated
        ? Math.floor(40 + Math.random() * 20)
        : Math.floor(75 + Math.random() * 20);

      const ticket: Ticket = {
        id: "t" + Date.now(),
        from: custName,
        email: custEmail,
        subject: subj,
        body: bod,
        reply: cleanReply,
        skill: matched?.name || "General inquiry",
        action: isEscalated ? "escalated" : "replied",
        confidence,
        color: matched?.color || "#3B82F6",
        time: new Date().toLocaleTimeString(),
      };
      addTicket(ticket);
      if (matched) bumpSkillUsage(matched.name);

      setResult({
        name: custName,
        email: custEmail,
        subject: subj,
        body: bod,
        reply: cleanReply,
        skillName: matched?.name || "General inquiry",
        confidence,
        escalated: isEscalated,
      });
      setEditedReply(cleanReply);
      setLoading(false);

      toast(
        isEscalated ? "Escalated to human — draft saved" : "Reply generated successfully ✓",
        "success"
      );
    } catch (err) {
      clearInterval(stepTimer);
      setLoading(false);
      let msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("401") || msg.includes("authentication"))
        msg = "Invalid API key. Check your key in Settings.";
      if (msg.includes("429")) msg = "Rate limited. Wait a moment and try again.";
      toast("Error: " + msg, "error");
    }
  }

  function copyReply() {
    navigator.clipboard
      .writeText(editedReply)
      .then(() => toast("Reply copied to clipboard", "success"));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Test reply</h1>
          <p>Simulate an incoming email and see how Replyloop handles it using your skills</p>
        </div>
      </div>

      <div className="page-body">
        <div className="simulate-form">
          <h3>
            <MailIcon />
            Incoming email
          </h3>
          <div className="sim-fields">
            <div className="form-group" style={{ margin: 0 }}>
              <label>From (customer name)</label>
              <input
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Customer email</label>
              <input
                type="text"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>Subject</label>
            <input
              type="text"
              placeholder="e.g. I need a refund"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Email body</label>
            <textarea
              rows={4}
              placeholder="Type the customer's message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-accent" onClick={runSimulation}>
              <PlayIcon />
              Run Replyloop
            </button>
            <button
              className="btn btn-ghost"
              onClick={generateRandom}
              title="Generate a random customer email"
            >
              <LoopIcon />
              Random email
            </button>
            <button className="btn btn-ghost" onClick={() => loadSample("refund")}>
              Refund
            </button>
            <button className="btn btn-ghost" onClick={() => loadSample("shipping")}>
              Shipping
            </button>
            <button className="btn btn-ghost" onClick={() => loadSample("password")}>
              Password
            </button>
            <button className="btn btn-ghost" onClick={() => loadSample("complaint")}>
              Complaint
            </button>
          </div>
        </div>

        {loading && (
          <div className="reply-panel">
            <div className="generating">
              <div className="spinner" />
              <span>{loadingText}</span>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="reply-panel">
            <div className="rp-header">
              <h3>Replyloop response</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className={`badge ${result.escalated ? "" : "badge-active"}`}
                  style={
                    result.escalated
                      ? { background: "var(--warn-pale)", color: "var(--warn)" }
                      : undefined
                  }
                >
                  {result.escalated ? "⚠️ Escalated" : "✓ Auto-replied"}
                </span>
              </div>
            </div>

            <div className="rp-email">
              <div className="from">
                From: <strong>{result.name}</strong> &lt;{result.email}&gt; · Subject:{" "}
                <strong>{result.subject}</strong>
              </div>
              <div className="body">{result.body}</div>
            </div>

            <div className="rp-reply">
              <div className="confidence-bar">
                <div className="label">
                  <span>
                    Skill matched: <strong>{result.skillName}</strong>
                  </span>
                  <span
                    style={{
                      color: result.confidence > 70 ? "var(--accent)" : "var(--warn)",
                    }}
                  >
                    {result.confidence}% confidence
                  </span>
                </div>
                <div className="bar">
                  <div className="fill" style={{ width: `${result.confidence}%` }} />
                </div>
              </div>

              <label>
                Replyloop&apos;s reply
                {result.escalated && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "var(--warn-pale)",
                      color: "var(--warn)",
                      fontWeight: 600,
                    }}
                  >
                    → Saved as draft for human review
                  </span>
                )}
              </label>
              <textarea
                rows={8}
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
              />
              <div className="rp-actions">
                <button className="btn btn-accent" onClick={copyReply}>
                  Copy reply
                </button>
                <Link className="btn btn-ghost" href="/tickets">
                  View in log
                </Link>
                <span
                  style={{
                    fontSize: 12,
                    color: result.escalated ? "var(--warn)" : "var(--accent)",
                    padding: "9px 0",
                  }}
                >
                  {result.escalated
                    ? "This would be sent to a human agent as a draft"
                    : "This would be sent automatically to the customer"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
