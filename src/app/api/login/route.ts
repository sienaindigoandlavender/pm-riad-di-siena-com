import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, gateConfigured, sameText, sessionValue } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!gateConfigured()) return NextResponse.json({ ok: true });
  const b = await req.json().catch(() => ({}));
  const password = typeof b.password === "string" ? b.password : "";
  if (!sameText(password, process.env.PM_PASSWORD ?? "")) {
    // a small pause makes guessing slow
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "wrong" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
