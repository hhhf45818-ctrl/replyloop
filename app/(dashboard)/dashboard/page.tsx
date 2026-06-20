"use client";

import Link from "next/link";
import { useReplyloop } from "@/components/ReplyloopProvider";
import { PlayIcon } from "@/components/icons";

export default function DashboardPage() {
  const { tickets, skills } = useReplyloop();

  const total = tickets.length;
  const replied = tickets.filter((t) => t.action === "replied").length;
  const escalated = tickets.filter((t) => t.action === "escalated").length;
  const activeSkills = skills.filter((s) => s.active);

  const recent = [...tickets].slice(-5).reverse();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Your AI reply activity at a glance</p>
        </div>
        <Link className="btn btn-accent" href="/simulate">
          <PlayIcon />
          Test Replyloop
        </Link>
      </div>

      <div className="page-body">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="num">{total}</div>
            <div className="lbl">Tickets handled</div>
            <div className="delta">All time</div>
          </div>
          <div className="stat-card">
            <div className="num">{replied}</div>
            <div className="lbl">Auto-replied</div>
            <div className="delta" style={{ color: "var(--accent)" }}>
              ↑ Replyloop handled
            </div>
          </div>
          <div className="stat-card">
            <div className="num">{escalated}</div>
            <div className="lbl">Escalated</div>
            <div className="delta" style={{ color: "var(--warn)" }}>
              Needs human
            </div>
          </div>
          <div className="stat-card">
            <div className="num">{activeSkills.length}</div>
            <div className="lbl">Active skills</div>
            <div className="delta">Ready to use</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="card">
            <h3 style={{ fontSize: 14, marginBottom: 14 }}>Recent ticket log</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recent.length === 0 ? (
                <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                  No tickets yet.{" "}
                  <Link href="/simulate" style={{ color: "var(--accent)" }}>
                    Test Replyloop →
                  </Link>
                </p>
              ) : (
                recent.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: "1px solid var(--line-2)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 7px",
                        borderRadius: 20,
                        fontWeight: 600,
                        background:
                          t.action === "replied" ? "var(--accent-pale)" : "var(--warn-pale)",
                        color: t.action === "replied" ? "var(--accent-2)" : "var(--warn)",
                      }}
                    >
                      {t.action}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--ink)",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.subject}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                      {t.skill || "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 14, marginBottom: 14 }}>Your skills</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeSkills.length === 0 ? (
                <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                  No active skills.{" "}
                  <Link href="/skills" style={{ color: "var(--accent)" }}>
                    Add skills →
                  </Link>
                </p>
              ) : (
                activeSkills.slice(0, 6).map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: "1px solid var(--line-2)",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{s.icon || "💡"}</span>
                    <span style={{ fontSize: 13, color: "var(--ink)", flex: 1 }}>{s.name}</span>
                    <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                      {s.usageCount || 0} uses
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
