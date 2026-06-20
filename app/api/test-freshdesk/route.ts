// POST /api/test-freshdesk
// Tests a Freshdesk connection with the provided credentials.
// Runs server-side to avoid browser CORS restrictions against Freshdesk.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface Body {
  domain?: string;
  key?: string;
}

function normalizeDomain(domain: string): string {
  let d = domain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  // Allow either "company" or "company.freshdesk.com"
  if (!d.includes(".")) d = `${d}.freshdesk.com`;
  return d;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { domain, key } = body;
  if (!domain || !key) {
    return NextResponse.json(
      { ok: false, error: "Missing Freshdesk domain or API key" },
      { status: 400 }
    );
  }

  const host = normalizeDomain(domain);
  const auth = "Basic " + Buffer.from(`${key}:X`).toString("base64");

  try {
    const res = await fetch(`https://${host}/api/v2/agents/me`, {
      headers: { Authorization: auth, "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const status = res.status;
      const error =
        status === 401
          ? "Authentication failed — check your API key"
          : `Freshdesk returned ${status} — check your domain and key`;
      return NextResponse.json({ ok: false, error }, { status: 200 });
    }

    const data = await res.json();
    const name = data?.contact?.name || data?.contact?.email || data?.email || "Agent";
    return NextResponse.json({ ok: true, name });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not reach Freshdesk — check your domain" },
      { status: 200 }
    );
  }
}
