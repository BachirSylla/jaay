import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { LAST_SHOP_COOKIE } from "@/features/shop/constants";
import { resolveHomePath } from "@/features/shop/home-path";
import { createClient } from "@/lib/supabase/server";

/** Entry point for signed-in users (links, proxy redirects): opens the right shop. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return NextResponse.redirect(new URL("/connexion", request.url));

  const lastSlug = (await cookies()).get(LAST_SHOP_COOKIE)?.value;
  const path = await resolveHomePath(supabase, userId, lastSlug);
  return NextResponse.redirect(new URL(path, request.url));
}
