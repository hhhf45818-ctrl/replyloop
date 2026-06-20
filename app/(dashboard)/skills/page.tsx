"use client";

import { useReplyloop } from "@/components/ReplyloopProvider";
import { SkillCard } from "@/components/SkillCard";
import { PlusIcon, SkillsIcon } from "@/components/icons";

export default function SkillsPage() {
  const { skills, openModal } = useReplyloop();

  const defaults = skills.filter((s) => s.isDefault);
  const custom = skills.filter((s) => !s.isDefault);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Skills library</h1>
          <p>Teach Replyloop how to handle each type of email</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <PlusIcon />
          Add skill
        </button>
      </div>

      <div className="page-body">
        <div className="section-label">Default skills — customer support</div>
        <div className="skills-grid">
          {defaults.map((s) => (
            <SkillCard key={s.id} skill={s} />
          ))}
        </div>

        <div className="section-label">Your custom skills</div>
        <div className="skills-grid">
          {custom.length === 0 ? (
            <div className="empty-box">
              <SkillsIcon />
              No custom skills yet — click &quot;Add skill&quot; to create your first one
            </div>
          ) : (
            custom.map((s) => <SkillCard key={s.id} skill={s} />)
          )}
        </div>
      </div>
    </>
  );
}
