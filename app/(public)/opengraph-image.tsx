import { ImageResponse } from "next/og";
import { getCurrentHospital } from "@/lib/tenant";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const hospital = await getCurrentHospital();
  const name = hospital?.name ?? "Hospital OS";
  const city = hospital?.city;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d3a8a 0%, #142a66 100%)",
          color: "#fff",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "rgba(255,255,255,0.15)",
            marginBottom: 40,
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", width: 32, height: 8, background: "#fff", borderRadius: 4 }} />
          <div style={{ position: "absolute", width: 8, height: 32, background: "#fff", borderRadius: 4 }} />
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
        {city && <div style={{ display: "flex", fontSize: 32, marginTop: 16, opacity: 0.8 }}>{city}</div>}
        <div style={{ display: "flex", fontSize: 28, marginTop: 40, opacity: 0.7 }}>Book your appointment online</div>
      </div>
    ),
    { ...size }
  );
}
