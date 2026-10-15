import { NextResponse, type NextRequest } from "next/server";
import { LAST_SHOP_COOKIE } from "@/features/shop/constants";
import { updateSession } from "@/lib/supabase/proxy";

const PROTECTED = [/^\/s\//, /^\/bienvenue(\/|$)/, /^\/app(\/|$)/];
const GUEST_ONLY = [/^\/connexion(\/|$)/, /^\/inscription(\/|$)/];

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const signedIn = Boolean(claims?.sub);

  if (!signedIn && PROTECTED.some((pattern) => pattern.test(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = pathname === "/app" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(url, response);
  }

  if (signedIn && GUEST_ONLY.some((pattern) => pattern.test(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  // Remember the last opened shop, to reopen it after the next sign-in.
  const shopMatch = /^\/s\/([a-z0-9-]+)/.exec(pathname);
  if (signedIn && shopMatch && request.cookies.get(LAST_SHOP_COOKIE)?.value !== shopMatch[1]) {
    response.cookies.set(LAST_SHOP_COOKIE, shopMatch[1], {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

/** Redirect while keeping the refreshed session cookies. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
