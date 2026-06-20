-- ════════════════════════════════════════════════════════════════
-- Replyloop database schema
-- Run in the Supabase SQL editor (or via `supabase db push`).
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── users ───────────────────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  created_at  timestamptz not null default now()
);

-- ── skills ──────────────────────────────────────────────────────
create table if not exists public.skills (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  name           text not null,
  when_to_use    text not null,
  how_to_handle  text not null,
  tone           text,
  escalate_if    text,
  example_reply  text,
  active         boolean not null default true,
  is_default     boolean not null default false,
  usage_count    integer not null default 0,
  icon           text,
  color          text,
  created_at     timestamptz not null default now()
);
create index if not exists skills_user_id_idx on public.skills(user_id);
create index if not exists skills_active_idx on public.skills(user_id, active);

-- ── tickets ─────────────────────────────────────────────────────
create table if not exists public.tickets (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users(id) on delete cascade,
  freshdesk_ticket_id  text,
  subject              text not null,
  body                 text,
  from_email           text,
  from_name            text,
  matched_skill        text,
  confidence           integer,
  action_taken         text default 'pending',  -- pending | replied | escalated
  reply_text           text,
  created_at           timestamptz not null default now()
);
create index if not exists tickets_user_id_idx on public.tickets(user_id);
create index if not exists tickets_created_at_idx on public.tickets(created_at desc);

-- ── settings ────────────────────────────────────────────────────
create table if not exists public.settings (
  user_id                  uuid primary key references public.users(id) on delete cascade,
  anthropic_key_encrypted  text,
  freshdesk_domain         text,
  freshdesk_key_encrypted  text,
  model                    text not null default 'claude-sonnet-4-20250514',
  threshold                integer not null default 80,
  updated_at               timestamptz not null default now()
);
create index if not exists settings_freshdesk_domain_idx on public.settings(freshdesk_domain);

-- ════════════════════════════════════════════════════════════════
-- Row Level Security
-- The Next.js app uses localStorage for the beta UI; all server access
-- (API routes + edge functions) uses the service-role key, which
-- bypasses RLS. We enable RLS with NO anon/public policies so the
-- anon key cannot read or write these tables directly.
-- ════════════════════════════════════════════════════════════════
alter table public.users    enable row level security;
alter table public.skills   enable row level security;
alter table public.tickets  enable row level security;
alter table public.settings enable row level security;

-- ════════════════════════════════════════════════════════════════
-- Seed: the 10 ecommerce default skills for a given user.
-- ════════════════════════════════════════════════════════════════
create or replace function public.seed_default_skills(p_user uuid)
returns void language plpgsql as $$
begin
  insert into public.skills
    (user_id, name, when_to_use, how_to_handle, tone, escalate_if, example_reply, active, is_default, icon, color)
  values
  (p_user, 'Order Status', 'When customer asks where their order is, when it will arrive, order tracking, where is my package, I have not received my order yet', E'1. Greet customer warmly by first name\n2. Acknowledge their concern\n3. Let them know you are checking their order\n4. Ask for order number if not provided\n5. Provide estimated delivery timeframe\n6. Share tracking link if available\n7. Apologize if delayed', 'Reassuring, proactive, helpful', 'Order is more than 14 days late, tracking shows no movement for 7+ days, customer says package was stolen or lost', 'Hi [name]! Thanks for reaching out. I can see your order was shipped and is expected to arrive soon. Let me know if you need anything else!', true, true, '📦', '#3B82F6'),
  (p_user, 'Refund Request', 'When customer wants money back, refund, cancel order, I want my money back, return item, order not as described, not satisfied', E'1. Apologize sincerely for the experience\n2. Check if within 30-day return window\n3. If yes -> confirm refund approved, explain 5-7 business days processing\n4. If no -> politely explain policy, offer store credit as alternative\n5. Ask for order number if not provided\n6. Thank them for their patience', 'Empathetic, understanding, never defensive', 'Refund amount over $200, customer mentions chargeback or lawyer, customer is extremely angry, order placed more than 60 days ago', 'Hi [name], I am so sorry to hear that! Since your order is within our 30-day return window, I have gone ahead and approved your refund. You will see it back on your card within 5-7 business days.', true, true, '💳', '#EF4444'),
  (p_user, 'Wrong Item Received', 'When customer received wrong product, wrong size, wrong color, wrong item, this is not what I ordered, received incorrect item', E'1. Apologize immediately and sincerely\n2. Confirm what they ordered vs received\n3. Ask for photo of wrong item received\n4. Offer two options: send correct item immediately OR full refund\n5. Tell them to keep the wrong item - no need to return\n6. Confirm resolution chosen', 'Apologetic, solution-focused, generous', 'Customer is very angry, multiple wrong items in same order, issue happened before with same customer', 'Hi [name], I am so sorry about this mix up! That is completely our mistake. Please send us a quick photo of what you received and we will ship the correct item right away - no need to send anything back.', true, true, '🔄', '#F59E0B'),
  (p_user, 'Damaged Product', 'When customer received broken, damaged, defective product, item arrived broken, packaging destroyed, product not working, arrived damaged', E'1. Apologize immediately\n2. Express genuine concern\n3. Ask for photo of damaged item\n4. Once confirmed offer: free replacement shipped immediately OR full refund\n5. No need to return damaged item\n6. Confirm shipping address for replacement', 'Apologetic, caring, action-oriented', 'High value item over $300, customer mentions injury from product, multiple items damaged, customer threatening legal action', 'Hi [name], I am truly sorry your order arrived damaged - that is not okay and completely on us. Could you send a quick photo? Once I see it I will get a replacement shipped right away at no charge.', true, true, '⚠️', '#DC2626'),
  (p_user, 'Order Cancellation', 'When customer wants to cancel order, cancel my order, I changed my mind, ordered by mistake, duplicate order, please cancel', E'1. Check if order has been shipped yet\n2. If NOT shipped -> cancel immediately, confirm full refund in 5-7 days\n3. If ALREADY shipped -> explain cannot cancel but can return when received for full refund\n4. Ask for order number if not provided\n5. Confirm action taken', 'Helpful, fast, no questions asked', 'Customer already paid and order shipped but refuses to wait, very large order cancellation over $500', 'Hi [name]! No problem at all. I have cancelled your order and a full refund will be back on your card within 5-7 business days. Sorry it did not work out this time!', true, true, '❌', '#8B5CF6'),
  (p_user, 'Product Questions', 'When customer asks about product details, sizes, materials, colors, dimensions, compatibility, how something works, does this come in, what size should I get', E'1. Answer their specific question clearly\n2. Provide relevant product details\n3. Help them make the right choice\n4. Suggest related products if relevant\n5. Include link to product page\n6. Offer to help with anything else', 'Knowledgeable, helpful, friendly', 'Very specific technical question you cannot answer accurately, customer has allergy or safety concern', 'Hi [name]! Great question. The product comes in multiple sizes and colors. Based on your description I would suggest checking our size guide. Let me know if you have any other questions!', true, true, '💡', '#06B6D4'),
  (p_user, 'Discount & Promo Code', 'When promo code not working, discount not applied, asking for discount, coupon expired, my code does not work, student discount, first order discount', E'1. Acknowledge the issue\n2. Check if code is valid and not expired\n3. If valid -> explain how to apply correctly at checkout\n4. If expired -> apologize, offer one time exception or alternative discount\n5. If asking for discount -> offer newsletter signup for 10% off', 'Helpful, generous, solution-focused', 'Customer claims they were promised a discount by someone on your team, large order with significant discount request', 'Hi [name]! Sorry the code is not working. Make sure to enter it exactly as shown before clicking checkout. If it still does not work let me know and I will apply the discount manually to your order.', true, true, '🏷️', '#10B981'),
  (p_user, 'Delivery Address Issue', 'When customer gave wrong address, wants to change delivery address, moved since ordering, address typo, I entered wrong address, wrong shipping address', E'1. Check if order has been shipped yet\n2. If NOT shipped -> update address immediately, confirm new address\n3. If ALREADY shipped -> contact courier to redirect if possible, explain it may not always be possible\n4. Ask for correct address\n5. Confirm action taken', 'Urgent, helpful, solution-focused', 'Order already delivered to wrong address, courier cannot redirect package, high value order', 'Hi [name], no worries - I can help fix that! Since your order has not shipped yet I can update your delivery address. What is the correct address you would like us to ship to?', true, true, '📍', '#EC4899'),
  (p_user, 'Out of Stock', 'When customer asks about out of stock item, when will it be back, stock notification, I want this but it is sold out, waiting list request, back in stock', E'1. Apologize for the item being unavailable\n2. Give honest restock timeline if known\n3. Offer to add them to waitlist to notify when back in stock\n4. Suggest similar alternative products\n5. Thank them for their interest', 'Apologetic, helpful, proactive', 'Customer is very frustrated, item has been out of stock for months, customer placed order for out of stock item', 'Hi [name]! So sorry - that item is currently out of stock. Want me to add you to our notification list so you get an email the moment it is available again?', true, true, '🔔', '#F97316'),
  (p_user, 'Complaint Handling', 'When customer is angry, bad experience, threatening review, multiple issues, worst service ever, very frustrated, wants to speak to manager, extremely unhappy', E'1. Lead with empathy - never be defensive\n2. Acknowledge their frustration fully\n3. Apologize sincerely\n4. Do NOT make excuses\n5. Ask what would make it right for them\n6. Offer generous resolution\n7. Always escalate to human for final call', 'Empathetic, calm, never defensive, never dismissive', 'ALWAYS escalate complaint emails to human agent for final resolution', 'Hi [name], I am truly sorry for the experience you have had. This is not the standard we hold ourselves to and I completely understand your frustration. A member of our team will reach out to you personally within the next hour.', true, true, '😤', '#6366F1');
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- Seed the two beta accounts (UUIDs must match lib/auth.ts) and give
-- each the 10 default skills + default settings.
-- ════════════════════════════════════════════════════════════════
insert into public.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'beta1@replyloop.app'),
  ('00000000-0000-4000-8000-000000000002', 'beta2@replyloop.app')
on conflict (id) do nothing;

insert into public.settings (user_id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002')
on conflict (user_id) do nothing;

-- Seed default skills only if the user has none yet.
do $$
declare
  u uuid;
begin
  foreach u in array array[
    '00000000-0000-4000-8000-000000000001'::uuid,
    '00000000-0000-4000-8000-000000000002'::uuid
  ] loop
    if not exists (select 1 from public.skills where user_id = u) then
      perform public.seed_default_skills(u);
    end if;
  end loop;
end $$;
