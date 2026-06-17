"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, IndianRupee } from "lucide-react";

export type DoctorCard = {
  id: string;
  name: string;
  slug: string;
  qualification: string | null;
  opd_days: string[] | null;
  consultation_fee: number | null;
  department_id: string | null;
  departments: { id: string; name: string; slug: string } | null;
};

type Dept = { id: string; name: string };

function cn(...cls: (string | undefined | false)[]) {
  return cls.filter(Boolean).join(" ");
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

export function DoctorsGrid({ doctors, departments }: { doctors: DoctorCard[]; departments: Dept[] }) {
  const [active, setActive] = useState<string | null>(null);
  const filtered = active ? doctors.filter((d) => d.department_id === active) : doctors;

  return (
    <>
      {departments.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActive(null)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              !active ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:bg-muted"
            )}
          >
            All Doctors
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setActive(dept.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                active === dept.id ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:bg-muted"
              )}
            >
              {dept.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((doc, i) => (
          <Link
            key={doc.id}
            href={`/doctors/${doc.slug}`}
            className="group rounded-2xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5"
          >
            <div className={cn("mb-4 flex size-14 items-center justify-center rounded-2xl text-xl font-bold", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
              {doc.name.charAt(0)}
            </div>

            <p className="text-lg font-semibold leading-tight">{doc.name}</p>
            {doc.qualification && (
              <p className="mt-0.5 text-sm text-muted-foreground">{doc.qualification}</p>
            )}
            {doc.departments?.name && (
              <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {doc.departments.name}
              </span>
            )}
            {doc.opd_days && doc.opd_days.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3.5" />
                {doc.opd_days.slice(0, 3).join(", ")}
                {doc.opd_days.length > 3 && ` +${doc.opd_days.length - 3} more`}
              </div>
            )}
            {doc.consultation_fee && (
              <div className="mt-2 flex items-center gap-0.5 text-sm font-semibold">
                <IndianRupee className="size-3.5" />
                {doc.consultation_fee}
                <span className="ml-1 text-xs font-normal text-muted-foreground">consultation</span>
              </div>
            )}
            <p className="mt-4 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              View profile →
            </p>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">No doctors in this department.</p>
      )}
    </>
  );
}
