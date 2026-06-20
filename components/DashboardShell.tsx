"use client";

import { useReplyloop } from "./ReplyloopProvider";
import { Sidebar } from "./Sidebar";
import { SkillModal } from "./SkillModal";
import { ToastHost } from "./ToastHost";

// App chrome: sidebar + scrollable main area. Renders a quiet loading
// state until localStorage has hydrated and the session is verified,
// so unauthenticated users never see app content flash.
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { hydrated, user } = useReplyloop();

  if (!hydrated || !user) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="app">
        <Sidebar />
        <div className="main">{children}</div>
      </div>
      <SkillModal />
      <ToastHost />
    </>
  );
}
