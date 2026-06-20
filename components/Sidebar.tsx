"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReplyloop } from "./ReplyloopProvider";
import {
  LoopIcon,
  DashboardIcon,
  SkillsIcon,
  PlayIcon,
  MailIcon,
  SettingsIcon,
  SignOutIcon,
} from "./icons";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/skills", label: "Skills", icon: SkillsIcon },
  { href: "/simulate", label: "Test Replyloop", icon: PlayIcon },
  { href: "/tickets", label: "Ticket Log", icon: MailIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useReplyloop();

  return (
    <div className="sidebar">
      <div className="sb-brand">
        <div className="sb-logo">
          <LoopIcon />
        </div>
        <span className="sb-name" title={user?.email}>
          Replyloop
        </span>
      </div>

      <nav className="sb-nav">
        <div className="sb-section">Menu</div>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={pathname === href ? "active" : ""}>
            <Icon />
            {label}
          </Link>
        ))}
      </nav>

      <div className="sb-bottom">
        <div
          style={{
            padding: "8px 10px",
            background: "var(--accent-pale)",
            borderRadius: "var(--r)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, color: "var(--accent-2)", fontWeight: 600 }}>
            Replyloop Beta
          </span>
        </div>
        <button
          onClick={logout}
          style={{
            width: "100%",
            background: "none",
            border: "1px solid var(--line)",
            borderRadius: "var(--r)",
            padding: 8,
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--ink-mute)",
            cursor: "pointer",
            fontFamily: "var(--sans)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <SignOutIcon />
          Sign out
        </button>
      </div>
    </div>
  );
}
