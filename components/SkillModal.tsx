"use client";

import { useEffect, useState } from "react";
import { useReplyloop, type SkillFormData } from "./ReplyloopProvider";
import { CloseIcon } from "./icons";

const EMPTY: SkillFormData = {
  name: "",
  trigger: "",
  handle: "",
  tone: "",
  escalate: "",
  example: "",
};

export function SkillModal() {
  const { modalOpen, editingSkill, closeModal, saveSkill, toast } = useReplyloop();
  const [form, setForm] = useState<SkillFormData>(EMPTY);

  // Sync form when opening for add vs edit.
  useEffect(() => {
    if (!modalOpen) return;
    if (editingSkill) {
      setForm({
        name: editingSkill.name,
        trigger: editingSkill.trigger,
        handle: editingSkill.handle,
        tone: editingSkill.tone || "",
        escalate: editingSkill.escalate || "",
        example: editingSkill.example || "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [modalOpen, editingSkill]);

  function set<K extends keyof SkillFormData>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!form.name.trim()) {
      toast("Please enter a skill name", "error");
      return;
    }
    if (!form.trigger.trim()) {
      toast("Please describe when to use this skill", "error");
      return;
    }
    saveSkill({
      name: form.name.trim(),
      trigger: form.trigger.trim(),
      handle: form.handle.trim(),
      tone: form.tone.trim(),
      escalate: form.escalate.trim(),
      example: form.example.trim(),
    });
  }

  return (
    <div
      className={`modal-bg${modalOpen ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <h3>{editingSkill ? "Edit skill" : "Add new skill"}</h3>
          <button className="icon-btn" onClick={closeModal}>
            <CloseIcon />
          </button>
        </div>

        <div className="form-group">
          <label>Skill name</label>
          <input
            type="text"
            placeholder="e.g. Refund Requests"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>When should Replyloop use this skill?</label>
          <textarea
            rows={2}
            placeholder="e.g. When customer asks for refund, money back, or return..."
            value={form.trigger}
            onChange={(e) => set("trigger", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>How should Replyloop handle it?</label>
          <textarea
            rows={4}
            placeholder={"e.g. 1. Apologize for the inconvenience\n2. Check if within 30 days\n3. If yes → approve refund\n4. If no → offer store credit"}
            value={form.handle}
            onChange={(e) => set("handle", e.target.value)}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Tone of voice</label>
            <input
              type="text"
              placeholder="e.g. Empathetic, professional"
              value={form.tone}
              onChange={(e) => set("tone", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Escalate to human if...</label>
            <input
              type="text"
              placeholder="e.g. Customer mentions lawyer"
              value={form.escalate}
              onChange={(e) => set("escalate", e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Example reply (optional)</label>
          <textarea
            rows={2}
            placeholder={'e.g. "Hi [name], so sorry about that! I have approved your refund..."'}
            value={form.example}
            onChange={(e) => set("example", e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={closeModal}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Save skill
          </button>
        </div>
      </div>
    </div>
  );
}
