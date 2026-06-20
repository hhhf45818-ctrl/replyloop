// ════════════════════════════════════════════════════════════════
// Generated-style typings for the Replyloop Supabase schema.
// Mirrors supabase/schema.sql. Keep in sync if you change the schema.
// (You can regenerate with: supabase gen types typescript --local)
// ════════════════════════════════════════════════════════════════

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; created_at: string };
        Insert: { id?: string; email: string; created_at?: string };
        Update: { id?: string; email?: string; created_at?: string };
        Relationships: [];
      };
      skills: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          when_to_use: string;
          how_to_handle: string;
          tone: string | null;
          escalate_if: string | null;
          example_reply: string | null;
          active: boolean;
          is_default: boolean;
          usage_count: number;
          icon: string | null;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          when_to_use: string;
          how_to_handle: string;
          tone?: string | null;
          escalate_if?: string | null;
          example_reply?: string | null;
          active?: boolean;
          is_default?: boolean;
          usage_count?: number;
          icon?: string | null;
          color?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["skills"]["Insert"]>;
        Relationships: [];
      };
      tickets: {
        Row: {
          id: string;
          user_id: string;
          freshdesk_ticket_id: string | null;
          subject: string;
          body: string | null;
          from_email: string | null;
          from_name: string | null;
          matched_skill: string | null;
          confidence: number | null;
          action_taken: string | null;
          reply_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          freshdesk_ticket_id?: string | null;
          subject: string;
          body?: string | null;
          from_email?: string | null;
          from_name?: string | null;
          matched_skill?: string | null;
          confidence?: number | null;
          action_taken?: string | null;
          reply_text?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tickets"]["Insert"]>;
        Relationships: [];
      };
      settings: {
        Row: {
          user_id: string;
          anthropic_key_encrypted: string | null;
          freshdesk_domain: string | null;
          freshdesk_key_encrypted: string | null;
          model: string;
          threshold: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          anthropic_key_encrypted?: string | null;
          freshdesk_domain?: string | null;
          freshdesk_key_encrypted?: string | null;
          model?: string;
          threshold?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
