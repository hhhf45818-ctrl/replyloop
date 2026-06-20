// ════════════════════════════════════════════════════════════════
// Shared domain types for Replyloop.
//
// The front-end app uses the field names below (trigger/handle/escalate/
// example). The Supabase tables use snake_case column names
// (when_to_use/how_to_handle/escalate_if/example_reply) — see
// supabase/schema.sql and lib/mappers.ts for the mapping.
// ════════════════════════════════════════════════════════════════

export type SkillId = string;

export interface Skill {
  id: SkillId;
  name: string;
  /** When should Replyloop use this skill? → DB: when_to_use */
  trigger: string;
  /** How should Replyloop handle it? → DB: how_to_handle */
  handle: string;
  /** Tone of voice → DB: tone */
  tone: string;
  /** Escalate to human if... → DB: escalate_if */
  escalate: string;
  /** Example reply → DB: example_reply */
  example: string;
  active: boolean;
  isDefault: boolean;
  usageCount: number;
  icon: string;
  color: string;
}

export type TicketAction = "replied" | "escalated" | "pending";

export interface Ticket {
  id: string;
  /** Customer display name → DB: from_name */
  from: string;
  /** Customer email → DB: from_email */
  email: string;
  subject: string;
  /** Email body → DB: body */
  body: string;
  reply: string;
  /** Matched skill name → DB: matched_skill */
  skill: string;
  /** replied | escalated → DB: action_taken */
  action: TicketAction;
  confidence: number;
  color: string;
  time: string;
}

export interface AppSettings {
  apiKey: string;
  freshdeskDomain: string;
  freshdeskKey: string;
  model: string;
  threshold: number;
}

export interface ReplyloopState extends AppSettings {
  skills: Skill[];
  tickets: Ticket[];
  editingSkillId: SkillId | null;
}

export const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
];

export const ICONS = ["💡", "📦", "🔑", "🚚", "😤", "💳", "⭐", "🔄", "📋"];

// ── The 10 ecommerce default skills (ported verbatim from app.html) ──
export const DEFAULT_SKILLS: Skill[] = [
  { id: "d1", name: "Order Status", trigger: "When customer asks where their order is, when it will arrive, order tracking, where is my package, I have not received my order yet", handle: "1. Greet customer warmly by first name\n2. Acknowledge their concern\n3. Let them know you are checking their order\n4. Ask for order number if not provided\n5. Provide estimated delivery timeframe\n6. Share tracking link if available\n7. Apologize if delayed", tone: "Reassuring, proactive, helpful", escalate: "Order is more than 14 days late, tracking shows no movement for 7+ days, customer says package was stolen or lost", example: "Hi [name]! Thanks for reaching out. I can see your order was shipped and is expected to arrive soon. Let me know if you need anything else!", active: true, isDefault: true, usageCount: 0, icon: "📦", color: "#3B82F6" },
  { id: "d2", name: "Refund Request", trigger: "When customer wants money back, refund, cancel order, I want my money back, return item, order not as described, not satisfied", handle: "1. Apologize sincerely for the experience\n2. Check if within 30-day return window\n3. If yes → confirm refund approved, explain 5-7 business days processing\n4. If no → politely explain policy, offer store credit as alternative\n5. Ask for order number if not provided\n6. Thank them for their patience", tone: "Empathetic, understanding, never defensive", escalate: "Refund amount over $200, customer mentions chargeback or lawyer, customer is extremely angry, order placed more than 60 days ago", example: "Hi [name], I am so sorry to hear that! Since your order is within our 30-day return window, I have gone ahead and approved your refund. You will see it back on your card within 5-7 business days.", active: true, isDefault: true, usageCount: 0, icon: "💳", color: "#EF4444" },
  { id: "d3", name: "Wrong Item Received", trigger: "When customer received wrong product, wrong size, wrong color, wrong item, this is not what I ordered, received incorrect item", handle: "1. Apologize immediately and sincerely\n2. Confirm what they ordered vs received\n3. Ask for photo of wrong item received\n4. Offer two options: send correct item immediately OR full refund\n5. Tell them to keep the wrong item — no need to return\n6. Confirm resolution chosen", tone: "Apologetic, solution-focused, generous", escalate: "Customer is very angry, multiple wrong items in same order, issue happened before with same customer", example: "Hi [name], I am so sorry about this mix up! That is completely our mistake. Please send us a quick photo of what you received and we will ship the correct item right away — no need to send anything back.", active: true, isDefault: true, usageCount: 0, icon: "🔄", color: "#F59E0B" },
  { id: "d4", name: "Damaged Product", trigger: "When customer received broken, damaged, defective product, item arrived broken, packaging destroyed, product not working, arrived damaged", handle: "1. Apologize immediately\n2. Express genuine concern\n3. Ask for photo of damaged item\n4. Once confirmed offer: free replacement shipped immediately OR full refund\n5. No need to return damaged item\n6. Confirm shipping address for replacement", tone: "Apologetic, caring, action-oriented", escalate: "High value item over $300, customer mentions injury from product, multiple items damaged, customer threatening legal action", example: "Hi [name], I am truly sorry your order arrived damaged — that is not okay and completely on us. Could you send a quick photo? Once I see it I will get a replacement shipped right away at no charge.", active: true, isDefault: true, usageCount: 0, icon: "⚠️", color: "#DC2626" },
  { id: "d5", name: "Order Cancellation", trigger: "When customer wants to cancel order, cancel my order, I changed my mind, ordered by mistake, duplicate order, please cancel", handle: "1. Check if order has been shipped yet\n2. If NOT shipped → cancel immediately, confirm full refund in 5-7 days\n3. If ALREADY shipped → explain cannot cancel but can return when received for full refund\n4. Ask for order number if not provided\n5. Confirm action taken", tone: "Helpful, fast, no questions asked", escalate: "Customer already paid and order shipped but refuses to wait, very large order cancellation over $500", example: "Hi [name]! No problem at all. I have cancelled your order and a full refund will be back on your card within 5-7 business days. Sorry it did not work out this time!", active: true, isDefault: true, usageCount: 0, icon: "❌", color: "#8B5CF6" },
  { id: "d6", name: "Product Questions", trigger: "When customer asks about product details, sizes, materials, colors, dimensions, compatibility, how something works, does this come in, what size should I get", handle: "1. Answer their specific question clearly\n2. Provide relevant product details\n3. Help them make the right choice\n4. Suggest related products if relevant\n5. Include link to product page\n6. Offer to help with anything else", tone: "Knowledgeable, helpful, friendly", escalate: "Very specific technical question you cannot answer accurately, customer has allergy or safety concern", example: "Hi [name]! Great question. The product comes in multiple sizes and colors. Based on your description I would suggest checking our size guide. Let me know if you have any other questions!", active: true, isDefault: true, usageCount: 0, icon: "💡", color: "#06B6D4" },
  { id: "d7", name: "Discount & Promo Code", trigger: "When promo code not working, discount not applied, asking for discount, coupon expired, my code does not work, student discount, first order discount", handle: "1. Acknowledge the issue\n2. Check if code is valid and not expired\n3. If valid → explain how to apply correctly at checkout\n4. If expired → apologize, offer one time exception or alternative discount\n5. If asking for discount → offer newsletter signup for 10% off", tone: "Helpful, generous, solution-focused", escalate: "Customer claims they were promised a discount by someone on your team, large order with significant discount request", example: "Hi [name]! Sorry the code is not working. Make sure to enter it exactly as shown before clicking checkout. If it still does not work let me know and I will apply the discount manually to your order.", active: true, isDefault: true, usageCount: 0, icon: "🏷️", color: "#10B981" },
  { id: "d8", name: "Delivery Address Issue", trigger: "When customer gave wrong address, wants to change delivery address, moved since ordering, address typo, I entered wrong address, wrong shipping address", handle: "1. Check if order has been shipped yet\n2. If NOT shipped → update address immediately, confirm new address\n3. If ALREADY shipped → contact courier to redirect if possible, explain it may not always be possible\n4. Ask for correct address\n5. Confirm action taken", tone: "Urgent, helpful, solution-focused", escalate: "Order already delivered to wrong address, courier cannot redirect package, high value order", example: "Hi [name], no worries — I can help fix that! Since your order has not shipped yet I can update your delivery address. What is the correct address you would like us to ship to?", active: true, isDefault: true, usageCount: 0, icon: "📍", color: "#EC4899" },
  { id: "d9", name: "Out of Stock", trigger: "When customer asks about out of stock item, when will it be back, stock notification, I want this but it is sold out, waiting list request, back in stock", handle: "1. Apologize for the item being unavailable\n2. Give honest restock timeline if known\n3. Offer to add them to waitlist to notify when back in stock\n4. Suggest similar alternative products\n5. Thank them for their interest", tone: "Apologetic, helpful, proactive", escalate: "Customer is very frustrated, item has been out of stock for months, customer placed order for out of stock item", example: "Hi [name]! So sorry — that item is currently out of stock. Want me to add you to our notification list so you get an email the moment it is available again?", active: true, isDefault: true, usageCount: 0, icon: "🔔", color: "#F97316" },
  { id: "d10", name: "Complaint Handling", trigger: "When customer is angry, bad experience, threatening review, multiple issues, worst service ever, very frustrated, wants to speak to manager, extremely unhappy", handle: "1. Lead with empathy — never be defensive\n2. Acknowledge their frustration fully\n3. Apologize sincerely\n4. Do NOT make excuses\n5. Ask what would make it right for them\n6. Offer generous resolution\n7. Always escalate to human for final call", tone: "Empathetic, calm, never defensive, never dismissive", escalate: "ALWAYS escalate complaint emails to human agent for final resolution", example: "Hi [name], I am truly sorry for the experience you have had. This is not the standard we hold ourselves to and I completely understand your frustration. A member of our team will reach out to you personally within the next hour.", active: true, isDefault: true, usageCount: 0, icon: "😤", color: "#6366F1" },
];
