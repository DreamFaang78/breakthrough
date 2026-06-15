import { redirect } from "next/navigation";
import { StaffHeader } from "@/components/common/staff-header";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getHospitalById } from "@/lib/tenant";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/doctors", label: "Doctors" },
  { href: "/admin/departments", label: "Departments" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/timings", label: "Timings" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/profile", label: "Profile" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile || !["owner", "super_admin"].includes(profile.role)) {
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
      />
      <main className="p-4">{children}</main>
    </div>
  );
}
