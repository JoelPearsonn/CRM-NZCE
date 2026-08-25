import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    staleTimes: {
      dynamic: 20,
    },
  },
};

export default nextConfig;
