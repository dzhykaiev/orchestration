import type { NextConfig } from "next";

const internalApiOrigin = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/+$/, "");

const config: NextConfig = {
  transpilePackages: ["@orchestration/shared"],
  async redirects() {
    return [
      {
        source: "/workspaces",
        destination: "/companies",
        permanent: true,
      },
      {
        source: "/workspaces/:path*",
        destination: "/companies/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    if (internalApiOrigin) {
      return [
        {
          source: "/api/:path*",
          destination: `${internalApiOrigin}/api/:path*`,
        },
      ];
    }

    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:3001/api/:path*",
      },
    ];
  },
};

export default config;
