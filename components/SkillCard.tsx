"use client";

import type { Skill } from "@/lib/types";
import { useReplyloop } from "./ReplyloopProvider";
import { EditIcon, TrashIcon } from "./icons";

// One skill row (ported from skillCardHTML in app.html).
export function SkillCard({ skill }: { skill: Skill }) {
  const { toggleSkill, deleteSkill, openModal } = useReplyloop();
  const s = skill;

  return (
    <div className="skill-card" id={`skill-${s.id}`}>
      <div
        className="skill-icon"
        style={{ background: `${s.color}22`, color: s.color, fontSize: 18 }}
      >
        {s.icon || "💡"}
      </div>
      <div className="skill-info">
        <div className="skill-name">
          {s.name}
          <span className={`badge ${s.isDefault ? "badge-default" : "badge-custom"}`}>
            {s.isDefault ? "Default" : "Custom"}
          </span>
          <span className={`badge ${s.active ? "badge-active" : "badge-paused"}`}>
            {s.active ? "Active" : "Paused"}
          </span>
        </div>
        <div className="skill-desc">{s.trigger}</div>
        <div className="skill-meta">Used {s.usageCount || 0} times</div>
      </div>
      <div className="skill-actions">
        <label className="toggle" title="Toggle skill">
          <input
            type="checkbox"
            checked={s.active}
            onChange={(e) => toggleSkill(s.id, e.target.checked)}
          />
          <div className="toggle-track" />
          <div className="toggle-thumb" />
        </label>
        <button className="icon-btn" onClick={() => openModal(s.id)} title="Edit">
          <EditIcon />
        </button>
        <button className="icon-btn del" onClick={() => deleteSkill(s.id)} title="Delete">
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
