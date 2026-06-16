import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", width: 16, height: 4, background: "#fff", borderRadius: 2 }} />
        <div style={{ position: "absolute", width: 4, height: 16, background: "#fff", borderRadius: 2 }} />
      </div>
    ),
    { ...size }
  );
}
