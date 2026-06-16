import { redirect } from "next/navigation";
import { StaffHeader } from "@/components/common/staff-header";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getHospitalById } from "@/lib/tenant";

const NAV_LINKS = [
  { href: "/reception", label: "Dashboard" },
  { href: "/reception/walk-in", label: "Walk-in" },
  { href: "/reception/leads", label: "Leads" },
  { href: "/reception/follow-ups", label: "Follow-ups" },
];

export default async function ReceptionLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile || !["receptionist", "owner", "super_admin"].includes(profile.role)) {
    redirect("/login");
  }

  const hospital = profile.hospital_id ? await getHospitalById(profile.hospital_id) : null;

  return (
    <div className="min-h-screen">
      <StaffHeader
        hospitalName={hospital?.name ?? "Hospital OS"}
        fullName={profile.full_name}
        role={profile.role}
        navLinks={NAV_LINKS}
        hospitalId={profile.hospital_id}
      />
      <main className="p-4">{children}</main>
    </div>
  );
}
