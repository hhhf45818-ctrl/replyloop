"use client";

import { useReplyloop } from "@/components/ReplyloopProvider";
import { MailIcon } from "@/components/icons";

export default function TicketsPage() {
  const { tickets, clearTickets } = useReplyloop();
  const ordered = [...tickets].reverse();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Ticket log</h1>
          <p>Every email Replyloop has handled in your test session</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={clearTickets}>
          Clear log
        </button>
      </div>

      <div className="page-body">
        <div className="ticket-list">
          {ordered.length === 0 ? (
            <div className="empty-box">
              <MailIcon />
              No tickets yet. Go to Test Replyloop to simulate emails.
            </div>
          ) : (
            ordered.map((t) => (
              <div className="ticket-item" key={t.id}>
                <div className="ticket-top">
                  <span className="ticket-platform" style={{ background: t.color || "#888" }}>
                    {(t.from || "?")[0]}
                  </span>
                  <span className="ticket-subject">{t.subject}</span>
                  <span
                    className={`ticket-status ${
                      t.action === "replied" ? "status-replied" : "status-escalated"
                    }`}
                  >
                    {t.action}
                  </span>
                </div>
                <div className="ticket-preview">
                  {(t.body || "").substring(0, 100)}
                  {t.body && t.body.length > 100 ? "..." : ""}
                </div>
                <div className="ticket-meta">
                  <span>From: {t.from}</span>
                  <span>
                    Skill: <strong>{t.skill || "None matched"}</strong>
                  </span>
                  <span>Confidence: {t.confidence || 0}%</span>
                  <span>{t.time || ""}</span>
                </div>
                {t.reply && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: "var(--bg-soft)",
                      borderRadius: "var(--r)",
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "var(--ink-2)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {t.reply}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
