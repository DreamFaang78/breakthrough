import { redirect } from "next/navigation";
import { StaffHeader } from "@/components/common/staff-header";
import { getCurrentProfile } from "@/lib/auth/profile";

const NAV_LINKS = [
  { href: "/super", label: "Dashboard" },
  { href: "/super/hospitals", label: "Hospitals" },
];

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <StaffHeader
        hospitalName="Hospital OS — Super Admin"
        fullName={profile.full_name}
        role={profile.role}
        navLinks={NAV_LINKS}
      />
      <main className="p-4">{children}</main>
    </div>
  );
}
