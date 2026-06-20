# Replyloop

AI-powered customer support automation. Replyloop connects to **Freshdesk** and automatically replies to customer emails using **Claude AI** and a configurable **skills system**.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase**.

---

## What's inside

```
replyloop/
├── app/
│   ├── page.tsx                      → redirects to /login
│   ├── (auth)/login/page.tsx         → login page
│   ├── (dashboard)/
│   │   ├── layout.tsx                → sidebar + shared state + auth guard
│   │   ├── dashboard/page.tsx        → activity overview
│   │   ├── skills/page.tsx           → skills library (10 ecommerce defaults)
│   │   ├── simulate/page.tsx         → Test Replyloop (live Claude reply)
│   │   ├── tickets/page.tsx          → ticket log
│   │   └── settings/page.tsx         → API keys, Freshdesk, model, threshold
│   └── api/
│       ├── test-freshdesk/route.ts   → test Freshdesk credentials
│       └── connect-freshdesk/route.ts→ save (encrypted) + register webhook
├── components/                       → Sidebar, SkillCard, SkillModal, Toasts, state
├── lib/                              → supabase client, types, crypto, reply engine, auth
├── supabase/
│   ├── schema.sql                    → tables + RLS + default-skill seed
│   └── functions/
│       ├── freshdesk-webhook/        → inbound ticket → save → process
│       ├── process-ticket/           → skills → Claude → auto-send / escalate
│       └── send-reply/               → post reply to Freshdesk + log
├── vercel.json
└── .env.example
```

### Design
Warm off-white background (`#F5F2EC`), emerald accent (`#059669`), Inter body + Instrument Serif headings — a clean, minimal Linear/Vercel feel. The original design system is preserved verbatim in `app/globals.css`; Tailwind's theme (`tailwind.config.ts`) mirrors the same tokens.

### Auth (beta)
Two hardcoded beta accounts, session stored in `sessionStorage`. No public signup.

| Email | Password |
|-------|----------|
| `beta1@replyloop.app` | `Beta2024#Rply!` |
| `beta2@replyloop.app` | `Test2024#Loop!` |

The interactive app (skills, tickets, settings, Test Replyloop) runs on the client with `localStorage`, so it works immediately with **only an Anthropic key** — no backend required. Supabase + the edge functions power the **real inbound Freshdesk pipeline**.

---

## 1. Local setup

```bash
npm install
cp .env.example .env.local   # then fill in values (see below)
npm run dev                  # http://localhost:3000
```

Log in with a beta account → **Settings** → paste your Anthropic key → **Test Replyloop**.

---

## 2. Environment variables

Create `.env.local` (already gitignored). See `.env.example`.

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (**secret**) | Server-only; API routes & functions |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Server-side reply engine |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` | Encrypts stored Freshdesk/Anthropic keys (64 hex chars) |
| `NEXT_PUBLIC_SITE_URL` | your deployment URL | Used when registering webhooks |

> The Test Replyloop page only needs an Anthropic key (entered in the UI). The Supabase + encryption vars are required for the **real Freshdesk pipeline** (API routes + edge functions).

---

## 3. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL editor** → paste & run [`supabase/schema.sql`](supabase/schema.sql).
   - Creates `users`, `skills`, `tickets`, `settings` with RLS enabled.
   - Seeds the two beta users + the 10 default skills + default settings.
3. Copy the URL, anon key, and service-role key into your env vars.

### Deploy the edge functions

```bash
npm i -g supabase           # if not installed
supabase login
supabase link --project-ref <your-project-ref>

# Set function secrets
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set ENCRYPTION_KEY=<same 64-hex value as .env.local>
# SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.

# Deploy all three
supabase functions deploy freshdesk-webhook --no-verify-jwt
supabase functions deploy process-ticket
supabase functions deploy send-reply
```

### The pipeline
```
New Freshdesk ticket
      │  (webhook → ?user_id=…)
      ▼
freshdesk-webhook   save ticket (pending) ──▶ process-ticket
                                                    │  inject ALL active skills into Claude system prompt
                                                    │  parse [ESCALATE] + confidence
                                                    ▼
                                  confidence ≥ threshold & not escalated?
                                       ├─ yes ─▶ send-reply ─▶ Freshdesk reply + mark "replied"
                                       └─ no  ─▶ mark "escalated" (draft for a human)
```

---

## 4. Connect Freshdesk

In **Settings → Freshdesk Connection**:
1. Enter your domain (`yourcompany.freshdesk.com`) and API key
   (Freshdesk → profile → Profile Settings → API Key).
2. **Test connection** → green check confirms it works.
3. **Connect Freshdesk** → encrypts + saves the key, and attempts to register
   the new-ticket webhook automatically.

> Freshdesk has no fully plan-agnostic public API for creating automation webhooks. If auto-registration isn't available on your plan, the app returns the webhook URL — paste it into **Freshdesk → Admin → Automations → Ticket Creation → Trigger Webhook (POST)**.

---

## 5. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo
   (Next.js is auto-detected; `vercel.json` adds security headers).
3. **Settings → Environment Variables** → add all six variables from section 2.
4. **Deploy.** Set `NEXT_PUBLIC_SITE_URL` to the production URL and redeploy.

```bash
# or via CLI
npm i -g vercel
vercel
vercel --prod
```

---

## Default skills (ecommerce)

Order Status · Refund Request · Wrong Item Received · Damaged Product · Order Cancellation · Product Questions · Discount & Promo Code · Delivery Address Issue · Out of Stock · Complaint Handling

All skills can be edited, toggled active/paused, or deleted, and you can add your own. **Every active skill is injected into the Claude system prompt** by the reply engine.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
