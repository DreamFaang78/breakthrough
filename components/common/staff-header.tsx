import Link from "next/link";
import { SignOutButton } from "@/components/common/sign-out-button";
import { NotificationBell } from "@/components/common/notification-bell";

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
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight">{hospitalName}</span>
          <span className="text-xs text-muted-foreground capitalize">{role.replace("_", " ")}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {hospitalId && <NotificationBell hospitalId={hospitalId} />}
          <span className="text-sm text-muted-foreground">{fullName}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
