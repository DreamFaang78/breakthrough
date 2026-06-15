import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Staff route prefixes -> roles allowed in (Section 12, 26). */
const PROTECTED_ROLES: Record<string, string[]> = {
  "/admin": ["owner", "super_admin"],
  "/reception": ["receptionist", "owner", "super_admin"],
  "/doctor": ["doctor"],
  "/super": ["super_admin"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Tenant resolution for the public site (subdomain-based) ----
  // sharma-hospital.hospitalos.app -> slug "sharma-hospital"
  // localhost / apex / vercel preview -> ?hospital=slug or NEXT_PUBLIC_DEFAULT_HOSPITAL_SLUG
  const hostWithoutPort = (request.headers.get("host") ?? "").split(":")[0];
  const hostParts = hostWithoutPort.split(".");
  const isLocalOrApex =
    hostWithoutPort === "localhost" ||
    hostWithoutPort === "127.0.0.1" ||
    hostParts.length <= 2 ||
    hostWithoutPort.endsWith(".vercel.app");

  const hospitalSlug = isLocalOrApex
    ? request.nextUrl.searchParams.get("hospital") ??
      process.env.NEXT_PUBLIC_DEFAULT_HOSPITAL_SLUG ??
      "sharma-hospital"
    : hostParts[0];

  const extraHeaders = new Headers();
  extraHeaders.set("x-hospital-slug", hospitalSlug);

  const { supabaseResponse, user, supabase } = await updateSession(request, extraHeaders);

  // ---- Route protection for staff areas ----
  const protectedPrefix = Object.keys(PROTECTED_ROLES).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (protectedPrefix) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const allowedRoles = PROTECTED_ROLES[protectedPrefix];
    if (!profile || !allowedRoles.includes(profile.role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "not_authorized");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
