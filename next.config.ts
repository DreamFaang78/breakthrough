import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://vercel.live",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://vercel.live https://assets.vercel.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://graph.facebook.com https://challenges.cloudflare.com https://cloudflareinsights.com https://vercel.live wss://*.pusher.com",
              "frame-src 'self' https://www.google.com https://maps.google.com https://challenges.cloudflare.com https://vercel.live",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
