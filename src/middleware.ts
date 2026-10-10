import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, bearerOk, gateConfigured, sameText, sessionValue } from "@/lib/auth";

const OPEN = ["/login", "/api/login"];

export async function middleware(req: NextRequest) {
  // Until PM_PASSWORD and PM_SESSION_SECRET are set in Vercel, the gate stays open
  // (the old behaviour), so a deploy never locks Jacqueline out.
  if (!gateConfigured()) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (OPEN.includes(pathname)) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");
  if (isApi && bearerOk(req.headers.get("authorization"))) return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && sameText(cookie, await sessionValue())) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: "Oud doesn't know you yet" }, { status: 401 });

  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's own files and the icons.
  matcher: ["/((?!_next/static|_next/image|icon.svg|apple-icon.png|favicon.ico).*)"],
};
