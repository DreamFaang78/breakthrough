import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", width: 96, height: 24, background: "#fff", borderRadius: 8 }} />
        <div style={{ position: "absolute", width: 24, height: 96, background: "#fff", borderRadius: 8 }} />
      </div>
    ),
    { ...size }
  );
}
