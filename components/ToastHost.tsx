"use client";

import { useReplyloop } from "./ReplyloopProvider";

// Renders active toasts in the bottom-right corner (ported from app.html).
export function ToastHost() {
  const { toasts } = useReplyloop();
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast show${t.type ? " " + t.type : ""}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
