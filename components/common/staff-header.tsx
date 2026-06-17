"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/common/sign-out-button";
import { NotificationBell } from "@/components/common/notification-bell";

function initials(name: string) {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return letters.toUpperCase() || "?";
}

export function StaffHeader({
  hospitalName,
  fullName,
  role,
  navLinks,
  hospitalId,
}: {
  hospitalName: string;
  fullName: string;
  role: string;
  navLinks: { href: string; label: string }[];
  hospitalId?: string | null;
}) {
  const pathname = usePathname();
  const activeHref = navLinks
    .map((l) => l.href)
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
            {initials(hospitalName)}
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">{hospitalName}</span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
              {role.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {navLinks.map((link) => {
            const active = link.href === activeHref;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  "rounded-lg px-3 py-1.5 font-medium transition-colors " +
                  (active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User cluster */}
        <div className="flex items-center gap-2.5">
          {hospitalId && <NotificationBell hospitalId={hospitalId} />}
          <div className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {initials(fullName)}
            </span>
            <span className="hidden text-sm font-medium sm:inline">{fullName}</span>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
