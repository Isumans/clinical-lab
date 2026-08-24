import type { NextConfig } from "next";

const internalApiUrl =
  process.env.LABSYNC_INTERNAL_API_URL ??
  (process.env.NODE_ENV === "production"
    ? "http://backend:8000"
    : "http://127.0.0.1:8000");

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalApiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
