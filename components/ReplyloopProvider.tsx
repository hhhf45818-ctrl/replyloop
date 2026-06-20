"use client";

// ════════════════════════════════════════════════════════════════
// Global client state for the Replyloop app — a faithful React port
// of the localStorage state machine in the original app.html.
// Holds skills, tickets, settings, the skill modal, and toasts; all
// dashboard routes share this single source of truth.
// ════════════════════════════════════════════════════════════════

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  COLORS,
  DEFAULT_SKILLS,
  ICONS,
  type Skill,
  type Ticket,
} from "@/lib/types";
import { clearSession, getSession, type SessionUser } from "@/lib/auth";

const STORAGE_KEY = "replyloop";

interface PersistedState {
  apiKey: string;
  freshdeskDomain: string;
  freshdeskKey: string;
  model: string;
  threshold: number;
  skills: Skill[];
  tickets: Ticket[];
}

const INITIAL: PersistedState = {
  apiKey: "",
  freshdeskDomain: "",
  freshdeskKey: "",
  model: "claude-sonnet-4-20250514",
  threshold: 80,
  skills: [],
  tickets: [],
};

export interface SkillFormData {
  name: string;
  trigger: string;
  handle: string;
  tone: string;
  escalate: string;
  example: string;
}

export interface ToastItem {
  id: number;
  msg: string;
  type: "" | "success" | "error";
}

interface ReplyloopContextValue extends PersistedState {
  user: SessionUser | null;
  hydrated: boolean;

  // toasts
  toasts: ToastItem[];
  toast: (msg: string, type?: "" | "success" | "error") => void;

  // skill modal
  modalOpen: boolean;
  editingSkill: Skill | null;
  openModal: (editId?: string | null) => void;
  closeModal: () => void;
  saveSkill: (data: SkillFormData) => void;
  toggleSkill: (id: string, active: boolean) => void;
  deleteSkill: (id: string) => void;

  // tickets
  addTicket: (t: Ticket) => void;
  bumpSkillUsage: (skillName: string) => void;
  clearTickets: () => void;

  // settings
  setApiKey: (key: string) => void;
  saveFreshdesk: (domain: string, key: string) => void;
  setModel: (model: string) => void;
  setThreshold: (threshold: number) => void;
  resetAll: () => void;

  logout: () => void;
}

const Ctx = createContext<ReplyloopContextValue | null>(null);

export function useReplyloop(): ReplyloopContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useReplyloop must be used inside <ReplyloopProvider>");
  return v;
}

export function ReplyloopProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [state, setState] = useState<PersistedState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);

  // ── Auth guard + initial load ──
  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUser(session);

    let loaded: PersistedState = { ...INITIAL };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = { ...INITIAL, ...JSON.parse(raw) };
    } catch {
      /* ignore corrupt state */
    }
    // Seed the 10 default skills on first run.
    if (!loaded.skills || loaded.skills.length === 0) {
      loaded.skills = DEFAULT_SKILLS.map((s) => ({ ...s }));
    }
    setState(loaded);
    setHydrated(true);
  }, [router]);

  // ── Persist on change (after hydration) ──
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  // ── Toasts ──
  const toast = useCallback(
    (msg: string, type: "" | "success" | "error" = "") => {
      const id = ++toastId.current;
      setToasts((t) => [...t, { id, msg, type }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 3000);
    },
    []
  );

  // ── Skills ──
  const editingSkill = useMemo(
    () => state.skills.find((s) => s.id === editingSkillId) ?? null,
    [state.skills, editingSkillId]
  );

  const openModal = useCallback((editId: string | null = null) => {
    setEditingSkillId(editId);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingSkillId(null);
  }, []);

  const saveSkill = useCallback(
    (data: SkillFormData) => {
      setState((prev) => {
        if (editingSkillId) {
          const skills = prev.skills.map((s) =>
            s.id === editingSkillId ? { ...s, ...data } : s
          );
          return { ...prev, skills };
        }
        const customCount = prev.skills.filter((s) => !s.isDefault).length;
        const newSkill: Skill = {
          id: "c" + Date.now(),
          ...data,
          active: true,
          isDefault: false,
          usageCount: 0,
          icon: ICONS[customCount % ICONS.length],
          color: COLORS[customCount % COLORS.length],
        };
        return { ...prev, skills: [...prev.skills, newSkill] };
      });
      toast(editingSkillId ? "Skill updated" : "Skill added", "success");
      closeModal();
    },
    [editingSkillId, toast, closeModal]
  );

  const toggleSkill = useCallback((id: string, active: boolean) => {
    setState((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.id === id ? { ...s, active } : s)),
    }));
  }, []);

  const deleteSkill = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        skills: prev.skills.filter((s) => s.id !== id),
      }));
      toast("Skill deleted");
    },
    [toast]
  );

  // ── Tickets ──
  const addTicket = useCallback((t: Ticket) => {
    setState((prev) => ({ ...prev, tickets: [...prev.tickets, t] }));
  }, []);

  const bumpSkillUsage = useCallback((skillName: string) => {
    setState((prev) => ({
      ...prev,
      skills: prev.skills.map((s) =>
        s.name === skillName ? { ...s, usageCount: (s.usageCount || 0) + 1 } : s
      ),
    }));
  }, []);

  const clearTickets = useCallback(() => {
    setState((prev) => ({
      ...prev,
      tickets: [],
      skills: prev.skills.map((s) => ({ ...s, usageCount: 0 })),
    }));
    toast("Ticket log cleared");
  }, [toast]);

  // ── Settings ──
  const setApiKey = useCallback((key: string) => {
    setState((prev) => ({ ...prev, apiKey: key }));
  }, []);

  const saveFreshdesk = useCallback((domain: string, key: string) => {
    setState((prev) => ({
      ...prev,
      freshdeskDomain: domain.replace("https://", "").replace("/", ""),
      freshdeskKey: key,
    }));
  }, []);

  const setModel = useCallback((model: string) => {
    setState((prev) => ({ ...prev, model }));
  }, []);

  const setThreshold = useCallback((threshold: number) => {
    setState((prev) => ({ ...prev, threshold }));
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const fresh: PersistedState = {
      ...INITIAL,
      skills: DEFAULT_SKILLS.map((s) => ({ ...s })),
    };
    setState(fresh);
    toast("All data reset to defaults");
  }, [toast]);

  const logout = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  const value: ReplyloopContextValue = {
    ...state,
    user,
    hydrated,
    toasts,
    toast,
    modalOpen,
    editingSkill,
    openModal,
    closeModal,
    saveSkill,
    toggleSkill,
    deleteSkill,
    addTicket,
    bumpSkillUsage,
    clearTickets,
    setApiKey,
    saveFreshdesk,
    setModel,
    setThreshold,
    resetAll,
    logout,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
