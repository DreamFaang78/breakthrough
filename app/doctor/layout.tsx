import { redirect } from "next/navigation";
import { StaffHeader } from "@/components/common/staff-header";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getHospitalById } from "@/lib/tenant";

const NAV_LINKS = [{ href: "/doctor", label: "Dashboard" }];

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "doctor") {
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
