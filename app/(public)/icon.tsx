import { ImageResponse } from "next/og";
import { getCurrentHospital } from "@/lib/tenant";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const hospital = await getCurrentHospital();
  const letter = hospital?.name?.trim().charAt(0).toUpperCase() || "H";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1d3a8a",
          borderRadius: 6,
          color: "#fff",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        {letter}
      </div>
    ),
    { ...size }
  );
}
